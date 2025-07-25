import {
  PickerValueManager,
  replaceInvalidDateByNull,
  FieldValueManager,
  createDateStrForV7HiddenInputFromSections,
  createDateStrForV6InputFromSections,
  areDatesEqual,
  getTodayDate,
  getDefaultReferenceDate,
  PickerRangeValue,
  PickerNonNullableRangeValue,
  FieldRangeSection,
} from '@mui/x-date-pickers/internals';
import { PickerValidDate } from '@mui/x-date-pickers/models';
import { splitDateRangeSections, removeLastSeparator } from './date-fields-utils';
import type {
  DateRangeValidationError,
  DateTimeRangeValidationError,
  TimeRangeValidationError,
  RangePosition,
} from '../../models';

type RangePickerValueManager<
  TError extends
    | DateRangeValidationError
    | TimeRangeValidationError
    | DateTimeRangeValidationError = any,
> = PickerValueManager<PickerRangeValue, TError>;

export const rangeValueManager: RangePickerValueManager = {
  emptyValue: [null, null],
  getTodayValue: (utils, timezone, valueType) => [
    getTodayDate(utils, timezone, valueType),
    getTodayDate(utils, timezone, valueType),
  ],
  getInitialReferenceValue: ({ value, referenceDate: referenceDateProp, ...params }) => {
    const shouldKeepStartDate = params.adapter.isValid(value[0]);
    const shouldKeepEndDate = params.adapter.isValid(value[1]);

    if (shouldKeepStartDate && shouldKeepEndDate) {
      return value as PickerNonNullableRangeValue;
    }

    const referenceDate = referenceDateProp ?? getDefaultReferenceDate(params);
    const startReferenceDate = Array.isArray(referenceDate) ? referenceDate[0]! : referenceDate;
    const endReferenceDate = Array.isArray(referenceDate) ? referenceDate[1]! : referenceDate;

    return [
      shouldKeepStartDate ? value[0]! : startReferenceDate,
      shouldKeepEndDate ? value[1]! : endReferenceDate,
    ];
  },
  cleanValue: (utils, value) =>
    value.map((date) => replaceInvalidDateByNull(utils, date)) as PickerRangeValue,
  areValuesEqual: (utils, a, b) =>
    areDatesEqual(utils, a[0], b[0]) && areDatesEqual(utils, a[1], b[1]),
  isSameError: (a, b) => b !== null && a[1] === b[1] && a[0] === b[0],
  hasError: (error) => error[0] != null || error[1] != null,
  defaultErrorState: [null, null],
  getTimezone: (adapter, value) => {
    const timezoneStart = adapter.isValid(value[0]) ? adapter.getTimezone(value[0]) : null;
    const timezoneEnd = adapter.isValid(value[1]) ? adapter.getTimezone(value[1]) : null;

    if (timezoneStart != null && timezoneEnd != null && timezoneStart !== timezoneEnd) {
      throw new Error('MUI X: The timezone of the start and the end date should be the same.');
    }

    return timezoneStart ?? timezoneEnd;
  },
  setTimezone: (adapter, timezone, value) => [
    value[0] == null ? null : adapter.setTimezone(value[0], timezone),
    value[1] == null ? null : adapter.setTimezone(value[1], timezone),
  ],
};

export const getRangeFieldValueManager = ({
  dateSeparator = '–',
}: {
  dateSeparator: string | undefined;
}): FieldValueManager<PickerRangeValue> => ({
  updateReferenceValue: (adapter, value, prevReferenceValue) => {
    const shouldKeepStartDate = adapter.isValid(value[0]);
    const shouldKeepEndDate = adapter.isValid(value[1]);

    if (!shouldKeepStartDate && !shouldKeepEndDate) {
      return prevReferenceValue;
    }

    if (shouldKeepStartDate && shouldKeepEndDate) {
      return value as PickerNonNullableRangeValue;
    }

    if (shouldKeepStartDate) {
      return [value[0]!, prevReferenceValue[0]!];
    }

    return [prevReferenceValue[1]!, value[1]!];
  },
  getSectionsFromValue: ([start, end], getSectionsFromDate) => {
    const getSections = (newDate: PickerValidDate | null, position: RangePosition) => {
      const sections = getSectionsFromDate(newDate!);
      return sections.map((section, sectionIndex) => {
        if (sectionIndex === sections.length - 1 && position === 'start') {
          return {
            ...section,
            dateName: position,
            // TODO: Check if RTL still works
            endSeparator: `${section.endSeparator} ${dateSeparator} `,
          };
        }

        return {
          ...section,
          dateName: position,
        };
      });
    };

    return [...getSections(start, 'start'), ...getSections(end, 'end')];
  },
  getV7HiddenInputValueFromSections: (sections) => {
    const dateRangeSections = splitDateRangeSections(sections);
    return createDateStrForV7HiddenInputFromSections([
      ...dateRangeSections.startDate,
      ...dateRangeSections.endDate,
    ]);
  },
  getV6InputValueFromSections: (sections, localizedDigits, isRtl) => {
    const dateRangeSections = splitDateRangeSections(sections);
    return createDateStrForV6InputFromSections(
      [...dateRangeSections.startDate, ...dateRangeSections.endDate],
      localizedDigits,
      isRtl,
    );
  },
  parseValueStr: (valueStr, referenceValue, parseDate) => {
    // TODO: Improve because it would not work if some section have the same separator as the dateSeparator.
    const [startStr, endStr] = valueStr.split(dateSeparator);

    return [startStr, endStr].map((dateStr, index) => {
      if (dateStr == null) {
        return null;
      }

      return parseDate(dateStr.trim(), referenceValue[index]!);
    }) as PickerRangeValue;
  },
  getDateFromSection: (value, activeSection) => value[getActiveDateIndex(activeSection)],
  getDateSectionsFromValue: (sections, activeSection) => {
    const dateRangeSections = splitDateRangeSections(sections);
    if (getActiveDateIndex(activeSection) === 0) {
      return removeLastSeparator(dateRangeSections.startDate);
    }

    return dateRangeSections.endDate;
  },
  updateDateInValue: (value, activeSection, activeDate) => {
    if (getActiveDateIndex(activeSection) === 0) {
      return [activeDate, value[1]];
    }
    return [value[0], activeDate];
  },
  clearDateSections: (sections, activeSection) => {
    const dateRangeSections = splitDateRangeSections(sections);
    if (getActiveDateIndex(activeSection) === 0) {
      return [
        ...dateRangeSections.startDate.map((section) => ({ ...section, value: '' })),
        ...dateRangeSections.endDate,
      ];
    }

    return [
      ...dateRangeSections.startDate,
      ...dateRangeSections.endDate.map((section) => ({ ...section, value: '' })),
    ];
  },
});

function getActiveDateIndex(activeSection: FieldRangeSection | null): 0 | 1 {
  return activeSection == null || activeSection.dateName === 'start' ? 0 : 1;
}
