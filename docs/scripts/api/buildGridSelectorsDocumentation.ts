import * as path from 'path';
import * as ts from 'typescript';
import {
  formatType,
  getSymbolDescription,
  getSymbolJSDocTags,
  resolveExportSpecifier,
  writePrettifiedFile,
} from './utils';
import { XTypeScriptProject } from '../createXTypeScriptProjects';

interface BuildSelectorsDocumentationOptions {
  project: XTypeScriptProject;
  apiPagesFolder: string;
}

interface Selector {
  name: string;
  returnType: string;
  category?: string;
  deprecated?: string;
  description?: string;
}

export default async function buildGridSelectorsDocumentation(
  options: BuildSelectorsDocumentationOptions,
) {
  const { project, apiPagesFolder } = options;

  const selectors = (
    await Promise.all(
      Object.values(project.exports).map(async (symbol): Promise<Selector | null> => {
        if (!symbol.name.endsWith('Selector')) {
          return null;
        }

        symbol = resolveExportSpecifier(symbol, project);

        const tags = getSymbolJSDocTags(symbol);
        if (tags.ignore) {
          return null;
        }

        const type = project.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!);
        const signature = project.checker.getSignaturesOfType(type, ts.SignatureKind.Call)?.[0];

        if (!signature) {
          return null;
        }

        if (
          !/^[a-z]\w+Selector/.test(symbol.name) ||
          symbol.name === 'useGridSelector' // Ignore hook
        ) {
          return null;
        }

        const returnType = await formatType(
          project.checker
            .typeToString(signature.getReturnType(), undefined, ts.TypeFormatFlags.NoTruncation)
            // For now the community selectors are not overloading when exported from the pro
            .replace(/<GridApi(Community|Pro)>/g, ''),
        );
        const category = tags.category?.text?.[0].text;
        const deprecated = tags.deprecated?.text?.[0].text;
        const description = getSymbolDescription(symbol, project);

        return {
          name: symbol.name,
          returnType,
          category,
          deprecated,
          description,
        };
      }),
    )
  )
    .filter((el): el is Selector => !!el)
    .sort((a, b) => (a.name > b.name ? 1 : -1));

  writePrettifiedFile(
    path.resolve(apiPagesFolder, project.documentationFolderName, `selectors.json`),
    JSON.stringify(selectors),
    project,
  );
}
