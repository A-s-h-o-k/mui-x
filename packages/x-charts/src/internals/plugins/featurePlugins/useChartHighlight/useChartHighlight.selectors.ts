import { SeriesId } from '../../../../models/seriesType/common';
import { ChartSeriesType } from '../../../../models/seriesType/config';
import { UseChartSeriesSignature } from '../../corePlugins/useChartSeries/useChartSeries.types';
import { ChartRootSelector, createSelector } from '../../utils/selectors';
import { HighlightItemData, UseChartHighlightSignature } from './useChartHighlight.types';
import { HighlightScope } from './highlightConfig.types';
import { createIsHighlighted } from './createIsHighlighted';
import { createIsFaded } from './createIsFaded';

const selectHighlight: ChartRootSelector<UseChartHighlightSignature> = (state) => state.highlight;

const selectSeries: ChartRootSelector<UseChartSeriesSignature> = (state) => state.series;

export const selectorChartsHighlightScopePerSeriesId = createSelector(
  [selectSeries],
  (series): Map<SeriesId, Partial<HighlightScope> | undefined> => {
    const map = new Map<SeriesId, Partial<HighlightScope> | undefined>();

    Object.keys(series.processedSeries).forEach((seriesType) => {
      const seriesData = series.processedSeries[seriesType as ChartSeriesType];
      seriesData?.seriesOrder?.forEach((seriesId) => {
        const seriesItem = seriesData?.series[seriesId];
        map.set(seriesId, seriesItem?.highlightScope);
      });
    });
    return map;
  },
);

export const selectorChartsHighlightedItem = createSelector(
  [selectHighlight],
  function selectorChartsHighlightedItem(highlight) {
    return highlight.item;
  },
);

export const selectorChartsHighlightScope = createSelector(
  [selectorChartsHighlightScopePerSeriesId, selectorChartsHighlightedItem],
  function selectorChartsHighlightScope(seriesIdToHighlightScope, highlightedItem) {
    if (!highlightedItem) {
      return null;
    }
    const highlightScope = seriesIdToHighlightScope.get(highlightedItem.seriesId);

    if (highlightScope === undefined) {
      return null;
    }

    return highlightScope;
  },
);

export const selectorChartsIsHighlightedCallback = createSelector(
  [selectorChartsHighlightScope, selectorChartsHighlightedItem],
  createIsHighlighted,
);

export const selectorChartsIsFadedCallback = createSelector(
  [selectorChartsHighlightScope, selectorChartsHighlightedItem],
  createIsFaded,
);

export const selectorChartsIsHighlighted = createSelector(
  [
    selectorChartsHighlightScope,
    selectorChartsHighlightedItem,
    (_, item: HighlightItemData | null) => item,
  ],
  function selectorChartsIsHighlighted(highlightScope, highlightedItem, item) {
    return createIsHighlighted(highlightScope, highlightedItem)(item);
  },
);

export const selectorChartsIsFaded = createSelector(
  [
    selectorChartsHighlightScope,
    selectorChartsHighlightedItem,
    (_, item: HighlightItemData | null) => item,
  ],
  function selectorChartsIsFaded(highlightScope, highlightedItem, item) {
    return createIsFaded(highlightScope, highlightedItem)(item);
  },
);
