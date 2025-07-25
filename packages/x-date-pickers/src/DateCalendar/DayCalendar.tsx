'use client';
import * as React from 'react';
import useEventCallback from '@mui/utils/useEventCallback';
import Typography from '@mui/material/Typography';
import useSlotProps from '@mui/utils/useSlotProps';
import { useRtl } from '@mui/system/RtlProvider';
import { styled, useThemeProps } from '@mui/material/styles';
import composeClasses from '@mui/utils/composeClasses';
import clsx from 'clsx';
import { DefaultizedProps, SlotComponentPropsFromProps } from '@mui/x-internals/types';
import { PickersDay, PickerDayOwnerState, PickersDayProps } from '../PickersDay';
import { ExportedPickersDayProps } from '../PickersDay/PickersDay.types';
import { usePickerAdapter, usePickerTranslations } from '../hooks';
import { useNow } from '../internals/hooks/useUtils';
import { PickerOnChangeFn } from '../internals/hooks/useViews';
import { DAY_SIZE, DAY_MARGIN } from '../internals/constants/dimensions';
import {
  PickersSlideTransition,
  SlideDirection,
  SlideTransitionProps,
} from './PickersSlideTransition';
import {
  BaseDateValidationProps,
  DayValidationProps,
  MonthValidationProps,
  YearValidationProps,
} from '../internals/models/validation';
import { useIsDateDisabled } from './useIsDateDisabled';
import { findClosestEnabledDate, getWeekdays } from '../internals/utils/date-utils';
import { DayCalendarClasses, getDayCalendarUtilityClass } from './dayCalendarClasses';
import { PickerValidDate, TimezoneProps } from '../models';
import { DateCalendarClasses } from './dateCalendarClasses';
import { FormProps } from '../internals/models/formProps';
import { usePickerDayOwnerState } from '../PickersDay/usePickerDayOwnerState';

export interface DayCalendarSlots {
  /**
   * Custom component for day.
   * Check the [PickersDay](https://mui.com/x/api/date-pickers/pickers-day/) component.
   * @default PickersDay
   */
  day?: React.ElementType<PickersDayProps>;
}

export interface DayCalendarSlotProps {
  day?: SlotComponentPropsFromProps<PickersDayProps, {}, PickerDayOwnerState>;
}

export interface ExportedDayCalendarProps extends ExportedPickersDayProps {
  /**
   * If `true`, calls `renderLoading` instead of rendering the day calendar.
   * Can be used to preload information and show it in calendar.
   * @default false
   */
  loading?: boolean;
  /**
   * Component rendered on the "day" view when `props.loading` is true.
   * @returns {React.ReactNode} The node to render when loading.
   * @default () => "..."
   */
  renderLoading?: () => React.ReactNode;
  /**
   * Formats the day of week displayed in the calendar header.
   * @param {PickerValidDate} date The date of the day of week provided by the adapter.
   * @returns {string} The name to display.
   * @default (date: PickerValidDate) => adapter.format(date, 'weekdayShort').charAt(0).toUpperCase()
   */
  dayOfWeekFormatter?: (date: PickerValidDate) => string;
  /**
   * If `true`, the week number will be display in the calendar.
   */
  displayWeekNumber?: boolean;
  /**
   * The day view will show as many weeks as needed after the end of the current month to match this value.
   * Put it to 6 to have a fixed number of weeks in Gregorian calendars
   */
  fixedWeekNumber?: number;
}

export interface DayCalendarProps
  extends ExportedDayCalendarProps,
    DayValidationProps,
    MonthValidationProps,
    YearValidationProps,
    Required<BaseDateValidationProps>,
    DefaultizedProps<TimezoneProps, 'timezone'>,
    FormProps {
  className?: string;
  currentMonth: PickerValidDate;
  selectedDays: (PickerValidDate | null)[];
  onSelectedDaysChange: PickerOnChangeFn;
  focusedDay: PickerValidDate | null;
  isMonthSwitchingAnimating: boolean;
  onFocusedDayChange: (newFocusedDay: PickerValidDate) => void;
  onMonthSwitchingAnimationEnd: () => void;
  reduceAnimations: boolean;
  slideDirection: SlideDirection;
  TransitionProps?: Partial<SlideTransitionProps>;
  hasFocus: boolean;
  onFocusedViewChange?: (newHasFocus: boolean) => void;
  gridLabelId?: string;
  /**
   * Override or extend the styles applied to the component.
   */
  classes?: Partial<DayCalendarClasses>;
  /**
   * Overridable component slots.
   * @default {}
   */
  slots?: DayCalendarSlots;
  /**
   * The props used for each component slot.
   * @default {}
   */
  slotProps?: DayCalendarSlotProps;
}

const useUtilityClasses = (classes: Partial<DateCalendarClasses> | undefined) => {
  const slots = {
    root: ['root'],
    header: ['header'],
    weekDayLabel: ['weekDayLabel'],
    loadingContainer: ['loadingContainer'],
    slideTransition: ['slideTransition'],
    monthContainer: ['monthContainer'],
    weekContainer: ['weekContainer'],
    weekNumberLabel: ['weekNumberLabel'],
    weekNumber: ['weekNumber'],
  };

  return composeClasses(slots, getDayCalendarUtilityClass, classes);
};

const weeksContainerHeight = (DAY_SIZE + DAY_MARGIN * 2) * 6;

const PickersCalendarDayRoot = styled('div', {
  name: 'MuiDayCalendar',
  slot: 'Root',
})({});

const PickersCalendarDayHeader = styled('div', {
  name: 'MuiDayCalendar',
  slot: 'Header',
})({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
});

const PickersCalendarWeekDayLabel = styled(Typography, {
  name: 'MuiDayCalendar',
  slot: 'WeekDayLabel',
})(({ theme }) => ({
  width: 36,
  height: 40,
  margin: '0 2px',
  textAlign: 'center',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: (theme.vars || theme).palette.text.secondary,
}));

const PickersCalendarWeekNumberLabel = styled(Typography, {
  name: 'MuiDayCalendar',
  slot: 'WeekNumberLabel',
})(({ theme }) => ({
  width: 36,
  height: 40,
  margin: '0 2px',
  textAlign: 'center',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: (theme.vars || theme).palette.text.disabled,
}));

const PickersCalendarWeekNumber = styled(Typography, {
  name: 'MuiDayCalendar',
  slot: 'WeekNumber',
})(({ theme }) => ({
  ...theme.typography.caption,
  width: DAY_SIZE,
  height: DAY_SIZE,
  padding: 0,
  margin: `0 ${DAY_MARGIN}px`,
  color: (theme.vars || theme).palette.text.disabled,
  fontSize: '0.75rem',
  alignItems: 'center',
  justifyContent: 'center',
  display: 'inline-flex',
}));

const PickersCalendarLoadingContainer = styled('div', {
  name: 'MuiDayCalendar',
  slot: 'LoadingContainer',
})({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: weeksContainerHeight,
});

const PickersCalendarSlideTransition = styled(PickersSlideTransition, {
  name: 'MuiDayCalendar',
  slot: 'SlideTransition',
})({
  minHeight: weeksContainerHeight,
});

const PickersCalendarWeekContainer = styled('div', {
  name: 'MuiDayCalendar',
  slot: 'MonthContainer',
})({ overflow: 'hidden' });

const PickersCalendarWeek = styled('div', {
  name: 'MuiDayCalendar',
  slot: 'WeekContainer',
})({
  margin: `${DAY_MARGIN}px 0`,
  display: 'flex',
  justifyContent: 'center',
});

function WrappedDay({
  parentProps,
  day,
  focusedDay,
  selectedDays,
  isDateDisabled,
  currentMonthNumber,
  isViewFocused,
  ...other
}: Pick<PickersDayProps, 'onFocus' | 'onBlur' | 'onKeyDown' | 'onDaySelect'> & {
  parentProps: DayCalendarProps;
  day: PickerValidDate;
  isViewFocused: boolean;
  focusedDay: PickerValidDate | null;
  selectedDays: PickerValidDate[];
  isDateDisabled: (date: PickerValidDate | null) => boolean;
  currentMonthNumber: number;
}) {
  const {
    disabled,
    disableHighlightToday,
    isMonthSwitchingAnimating,
    showDaysOutsideCurrentMonth,
    slots,
    slotProps,
    timezone,
  } = parentProps;

  const adapter = usePickerAdapter();
  const now = useNow(timezone);

  const isFocusableDay = focusedDay != null && adapter.isSameDay(day, focusedDay);
  const isFocusedDay = isViewFocused && isFocusableDay;
  const isSelected = selectedDays.some((selectedDay) => adapter.isSameDay(selectedDay, day));
  const isToday = adapter.isSameDay(day, now);
  const isDisabled = React.useMemo(
    () => disabled || isDateDisabled(day),
    [disabled, isDateDisabled, day],
  );
  const isOutsideCurrentMonth = React.useMemo(
    () => adapter.getMonth(day) !== currentMonthNumber,
    [adapter, day, currentMonthNumber],
  );

  const ownerState = usePickerDayOwnerState({
    day,
    selected: isSelected,
    disabled: isDisabled,
    today: isToday,
    outsideCurrentMonth: isOutsideCurrentMonth,
    disableMargin: undefined, // This prop can only be defined using slotProps.day so the ownerState for useSlotProps cannot have its value.
    disableHighlightToday,
    showDaysOutsideCurrentMonth,
  });

  const Day = slots?.day ?? PickersDay;
  // We don't want to pass to ownerState down, to avoid re-rendering all the day whenever a prop changes.
  const { ownerState: dayOwnerState, ...dayProps } = useSlotProps({
    elementType: Day,
    externalSlotProps: slotProps?.day,
    additionalProps: {
      disableHighlightToday,
      showDaysOutsideCurrentMonth,
      role: 'gridcell',
      isAnimating: isMonthSwitchingAnimating,
      // it is used in date range dragging logic by accessing `dataset.timestamp`
      'data-timestamp': adapter.toJsDate(day).valueOf(),
      ...other,
    },
    ownerState: { ...ownerState, day, isDayDisabled: isDisabled, isDaySelected: isSelected },
  });

  const isFirstVisibleCell = React.useMemo(() => {
    const startOfMonth = adapter.startOfMonth(adapter.setMonth(day, currentMonthNumber));
    if (!showDaysOutsideCurrentMonth) {
      return adapter.isSameDay(day, startOfMonth);
    }
    return adapter.isSameDay(day, adapter.startOfWeek(startOfMonth));
  }, [currentMonthNumber, day, showDaysOutsideCurrentMonth, adapter]);

  const isLastVisibleCell = React.useMemo(() => {
    const endOfMonth = adapter.endOfMonth(adapter.setMonth(day, currentMonthNumber));
    if (!showDaysOutsideCurrentMonth) {
      return adapter.isSameDay(day, endOfMonth);
    }
    return adapter.isSameDay(day, adapter.endOfWeek(endOfMonth));
  }, [currentMonthNumber, day, showDaysOutsideCurrentMonth, adapter]);

  return (
    <Day
      {...dayProps}
      day={day}
      disabled={isDisabled}
      autoFocus={!isOutsideCurrentMonth && isFocusedDay}
      today={isToday}
      outsideCurrentMonth={isOutsideCurrentMonth}
      isFirstVisibleCell={isFirstVisibleCell}
      isLastVisibleCell={isLastVisibleCell}
      selected={isSelected}
      tabIndex={isFocusableDay ? 0 : -1}
      aria-selected={isSelected}
      aria-current={isToday ? 'date' : undefined}
    />
  );
}

/**
 * @ignore - do not document.
 */
export function DayCalendar(inProps: DayCalendarProps) {
  const props = useThemeProps({ props: inProps, name: 'MuiDayCalendar' });
  const adapter = usePickerAdapter();

  const {
    onFocusedDayChange,
    className,
    classes: classesProp,
    currentMonth,
    selectedDays,
    focusedDay,
    loading,
    onSelectedDaysChange,
    onMonthSwitchingAnimationEnd,
    readOnly,
    reduceAnimations,
    renderLoading = () => <span data-testid="loading-progress">...</span>,
    slideDirection,
    TransitionProps,
    disablePast,
    disableFuture,
    minDate,
    maxDate,
    shouldDisableDate,
    shouldDisableMonth,
    shouldDisableYear,
    dayOfWeekFormatter = (date) => adapter.format(date, 'weekdayShort').charAt(0).toUpperCase(),
    hasFocus,
    onFocusedViewChange,
    gridLabelId,
    displayWeekNumber,
    fixedWeekNumber,
    timezone,
  } = props;

  const now = useNow(timezone);
  const classes = useUtilityClasses(classesProp);
  const isRtl = useRtl();

  const isDateDisabled = useIsDateDisabled({
    shouldDisableDate,
    shouldDisableMonth,
    shouldDisableYear,
    minDate,
    maxDate,
    disablePast,
    disableFuture,
    timezone,
  });

  const translations = usePickerTranslations();

  const handleDaySelect = useEventCallback((day: PickerValidDate) => {
    if (readOnly) {
      return;
    }

    onSelectedDaysChange(day);
  });

  const focusDay = (day: PickerValidDate) => {
    if (!isDateDisabled(day)) {
      onFocusedDayChange(day);
      onFocusedViewChange?.(true);
    }
  };

  const handleKeyDown = useEventCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, day: PickerValidDate) => {
      switch (event.key) {
        case 'ArrowUp':
          focusDay(adapter.addDays(day, -7));
          event.preventDefault();
          break;
        case 'ArrowDown':
          focusDay(adapter.addDays(day, 7));
          event.preventDefault();
          break;
        case 'ArrowLeft': {
          const newFocusedDayDefault = adapter.addDays(day, isRtl ? 1 : -1);
          const nextAvailableMonth = adapter.addMonths(day, isRtl ? 1 : -1);

          const closestDayToFocus = findClosestEnabledDate({
            adapter,
            date: newFocusedDayDefault,
            minDate: isRtl ? newFocusedDayDefault : adapter.startOfMonth(nextAvailableMonth),
            maxDate: isRtl ? adapter.endOfMonth(nextAvailableMonth) : newFocusedDayDefault,
            isDateDisabled,
            timezone,
          });
          focusDay(closestDayToFocus || newFocusedDayDefault);
          event.preventDefault();
          break;
        }
        case 'ArrowRight': {
          const newFocusedDayDefault = adapter.addDays(day, isRtl ? -1 : 1);
          const nextAvailableMonth = adapter.addMonths(day, isRtl ? -1 : 1);

          const closestDayToFocus = findClosestEnabledDate({
            adapter,
            date: newFocusedDayDefault,
            minDate: isRtl ? adapter.startOfMonth(nextAvailableMonth) : newFocusedDayDefault,
            maxDate: isRtl ? newFocusedDayDefault : adapter.endOfMonth(nextAvailableMonth),
            isDateDisabled,
            timezone,
          });
          focusDay(closestDayToFocus || newFocusedDayDefault);
          event.preventDefault();
          break;
        }
        case 'Home':
          focusDay(adapter.startOfWeek(day));
          event.preventDefault();
          break;
        case 'End':
          focusDay(adapter.endOfWeek(day));
          event.preventDefault();
          break;
        case 'PageUp':
          focusDay(adapter.addMonths(day, 1));
          event.preventDefault();
          break;
        case 'PageDown':
          focusDay(adapter.addMonths(day, -1));
          event.preventDefault();
          break;
        default:
          break;
      }
    },
  );

  const handleFocus = useEventCallback(
    (event: React.FocusEvent<HTMLButtonElement>, day: PickerValidDate) => focusDay(day),
  );

  const handleBlur = useEventCallback(
    (event: React.FocusEvent<HTMLButtonElement>, day: PickerValidDate) => {
      if (focusedDay != null && adapter.isSameDay(focusedDay, day)) {
        onFocusedViewChange?.(false);
      }
    },
  );

  const currentMonthNumber = adapter.getMonth(currentMonth);
  const currentYearNumber = adapter.getYear(currentMonth);
  const validSelectedDays = React.useMemo(
    () =>
      selectedDays
        .filter((day): day is PickerValidDate => !!day)
        .map((day) => adapter.startOfDay(day)),
    [adapter, selectedDays],
  );

  // need a new ref whenever the `key` of the transition changes: https://reactcommunity.org/react-transition-group/transition/#Transition-prop-nodeRef.
  const transitionKey = `${currentYearNumber}-${currentMonthNumber}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const slideNodeRef = React.useMemo(() => React.createRef<HTMLDivElement>(), [transitionKey]);

  const weeksToDisplay = React.useMemo(() => {
    const toDisplay = adapter.getWeekArray(currentMonth);
    let nextMonth = adapter.addMonths(currentMonth, 1);
    while (fixedWeekNumber && toDisplay.length < fixedWeekNumber) {
      const additionalWeeks = adapter.getWeekArray(nextMonth);
      const hasCommonWeek = adapter.isSameDay(
        toDisplay[toDisplay.length - 1][0],
        additionalWeeks[0][0],
      );

      additionalWeeks.slice(hasCommonWeek ? 1 : 0).forEach((week) => {
        if (toDisplay.length < fixedWeekNumber) {
          toDisplay.push(week);
        }
      });

      nextMonth = adapter.addMonths(nextMonth, 1);
    }
    return toDisplay;
  }, [currentMonth, fixedWeekNumber, adapter]);

  return (
    <PickersCalendarDayRoot role="grid" aria-labelledby={gridLabelId} className={classes.root}>
      <PickersCalendarDayHeader role="row" className={classes.header}>
        {displayWeekNumber && (
          <PickersCalendarWeekNumberLabel
            variant="caption"
            role="columnheader"
            aria-label={translations.calendarWeekNumberHeaderLabel}
            className={classes.weekNumberLabel}
          >
            {translations.calendarWeekNumberHeaderText}
          </PickersCalendarWeekNumberLabel>
        )}
        {getWeekdays(adapter, now).map((weekday, i) => (
          <PickersCalendarWeekDayLabel
            key={i.toString()}
            variant="caption"
            role="columnheader"
            aria-label={adapter.format(weekday, 'weekday')}
            className={classes.weekDayLabel}
          >
            {dayOfWeekFormatter(weekday)}
          </PickersCalendarWeekDayLabel>
        ))}
      </PickersCalendarDayHeader>

      {loading ? (
        <PickersCalendarLoadingContainer className={classes.loadingContainer}>
          {renderLoading()}
        </PickersCalendarLoadingContainer>
      ) : (
        <PickersCalendarSlideTransition
          transKey={transitionKey}
          onExited={onMonthSwitchingAnimationEnd}
          reduceAnimations={reduceAnimations}
          slideDirection={slideDirection}
          className={clsx(className, classes.slideTransition)}
          {...TransitionProps}
          nodeRef={slideNodeRef}
        >
          <PickersCalendarWeekContainer
            data-testid="pickers-calendar"
            ref={slideNodeRef}
            role="rowgroup"
            className={classes.monthContainer}
          >
            {weeksToDisplay.map((week, index) => (
              <PickersCalendarWeek
                role="row"
                key={`week-${week[0]}`}
                className={classes.weekContainer}
                // fix issue of announcing row 1 as row 2
                // caused by week day labels row
                aria-rowindex={index + 1}
              >
                {displayWeekNumber && (
                  <PickersCalendarWeekNumber
                    className={classes.weekNumber}
                    role="rowheader"
                    aria-label={translations.calendarWeekNumberAriaLabelText(
                      adapter.getWeekNumber(week[0]),
                    )}
                  >
                    {translations.calendarWeekNumberText(adapter.getWeekNumber(week[0]))}
                  </PickersCalendarWeekNumber>
                )}
                {week.map((day, dayIndex) => (
                  <WrappedDay
                    key={(day as any).toString()}
                    parentProps={props}
                    day={day}
                    selectedDays={validSelectedDays}
                    isViewFocused={hasFocus}
                    focusedDay={focusedDay}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onDaySelect={handleDaySelect}
                    isDateDisabled={isDateDisabled}
                    currentMonthNumber={currentMonthNumber}
                    // fix issue of announcing column 1 as column 2 when `displayWeekNumber` is enabled
                    aria-colindex={dayIndex + 1}
                  />
                ))}
              </PickersCalendarWeek>
            ))}
          </PickersCalendarWeekContainer>
        </PickersCalendarSlideTransition>
      )}
    </PickersCalendarDayRoot>
  );
}
