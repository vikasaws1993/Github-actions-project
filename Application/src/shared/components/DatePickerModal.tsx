import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../context/LanguageContext';

interface DatePickerModalProps {
  visible: boolean;
  value?: string; // dd/mm/yyyy or yyyy-mm-dd
  onConfirm: (formattedDate: string) => void; // returns dd/mm/yyyy
  onClose: () => void;
  title?: string;
  maxDate?: Date;
  minDate?: Date;
}

const MONTHS_MR = [
  'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
];
const MONTHS_SHORT_MR = [
  'जाने', 'फेब्रु', 'मार्च', 'एप्रि', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें'
];
const DAYS_MR = ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

const MONTHS_HI = [
  'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
];
const MONTHS_SHORT_HI = [
  'जन', 'फर', 'मार्च', 'अप्रै', 'मई', 'जून',
  'जुलाई', 'अग', 'सितं', 'अक्टू', 'नव', 'दिसं'
];
const DAYS_HI = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  value,
  onConfirm,
  onClose,
  title,
  maxDate = new Date(),
  minDate = new Date(1920, 0, 1),
}) => {
  const { language, t } = useLanguage();

  // Parse incoming value safely
  const parseInitialDate = (val?: string): Date => {
    if (!val) {
      // Default to an 18-25 year old range date for adult registration convenience or current year
      const d = new Date();
      d.setFullYear(d.getFullYear() - 20);
      return d;
    }
    const clean = val.trim();
    // DD/MM/YYYY or DD-MM-YYYY
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(clean)) {
      const parts = clean.split(/[\/\-]/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // YYYY-MM-DD
    if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(clean)) {
      const parts = clean.split(/[\/\-]/);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date(2000, 0, 1);
  };

  const [selectedDate, setSelectedDate] = useState<Date>(() => parseInitialDate(value));
  const [viewYear, setViewYear] = useState<number>(() => parseInitialDate(value).getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => parseInitialDate(value).getMonth());
  const [mode, setMode] = useState<'day' | 'month' | 'year'>('day');

  useEffect(() => {
    if (visible) {
      const initial = parseInitialDate(value);
      setSelectedDate(initial);
      setViewYear(initial.getFullYear());
      setViewMonth(initial.getMonth());
      setMode('day');
    }
  }, [visible, value]);

  const monthNames = language === 'mr' ? MONTHS_MR : language === 'hi' ? MONTHS_HI : MONTHS_EN;
  const monthShortNames = language === 'mr' ? MONTHS_SHORT_MR : language === 'hi' ? MONTHS_SHORT_HI : MONTHS_SHORT_EN;
  const dayNames = language === 'mr' ? DAYS_MR : language === 'hi' ? DAYS_HI : DAYS_EN;

  // Years array from maxDate to minDate
  const years = useMemo(() => {
    const list: number[] = [];
    const maxYear = maxDate.getFullYear();
    const minYear = minDate.getFullYear();
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [maxDate, minDate]);

  // Days in current view month & year
  const daysGrid = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const grid: Array<{ day: number | null; date?: Date; disabled?: boolean }> = [];

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push({ day: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(viewYear, viewMonth, d);
      const isAfterMax = cellDate.getTime() > maxDate.getTime();
      const isBeforeMin = cellDate.getTime() < minDate.getTime();
      grid.push({
        day: d,
        date: cellDate,
        disabled: isAfterMax || isBeforeMin,
      });
    }

    return grid;
  }, [viewYear, viewMonth, maxDate, minDate]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    if (nextDate.getTime() <= maxDate.getTime()) {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((prev) => prev + 1);
      } else {
        setViewMonth((prev) => prev + 1);
      }
    }
  };

  const handleSelectDay = (cellDate: Date) => {
    setSelectedDate(cellDate);
  };

  const handleConfirm = () => {
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const y = selectedDate.getFullYear();
    const formatted = `${d}/${m}/${y}`;
    onConfirm(formatted);
    onClose();
  };

  // Calculate age from selected date
  const calculatedAge = useMemo(() => {
    const today = new Date();
    let age = today.getFullYear() - selectedDate.getFullYear();
    const m = today.getMonth() - selectedDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }, [selectedDate]);

  const formattedSelected = useMemo(() => {
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const y = selectedDate.getFullYear();
    return `${d}/${m}/${y}`;
  }, [selectedDate]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerCard}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitleText}>
                {title || (language === 'mr' ? 'जन्म तारीख निवडा' : language === 'hi' ? 'जन्म तिथि चुनें' : 'Select Date of Birth')}
              </Text>
              <Text style={styles.dateDisplayLarge}>
                {selectedDate.getDate()} {monthShortNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
            </View>

            {/* Age Badge */}
            <View style={styles.ageBadge}>
              <Ionicons name="person" size={12} color="#0A5C53" style={{ marginRight: 3 }} />
              <Text style={styles.ageBadgeText}>
                {calculatedAge} {t('years') || (language === 'mr' ? 'वर्षे' : language === 'hi' ? 'वर्ष' : 'yrs')}
              </Text>
            </View>
          </View>

          {/* Month / Year Navigator */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setMode(mode === 'month' ? 'day' : 'month')}
              activeOpacity={0.75}
            >
              <Text style={styles.navBtnText}>{monthNames[viewMonth]}</Text>
              <Ionicons name={mode === 'month' ? 'chevron-up' : 'chevron-down'} size={14} color="#0A5C53" style={{ marginLeft: 3 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setMode(mode === 'year' ? 'day' : 'year')}
              activeOpacity={0.75}
            >
              <Text style={styles.navBtnText}>{viewYear}</Text>
              <Ionicons name={mode === 'year' ? 'chevron-up' : 'chevron-down'} size={14} color="#0A5C53" style={{ marginLeft: 3 }} />
            </TouchableOpacity>

            {mode === 'day' && (
              <View style={styles.monthArrows}>
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={handlePrevMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={18} color="#0A5C53" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={handleNextMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-forward" size={18} color="#0A5C53" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ══════════════ DAY VIEW (CALENDAR GRID) ══════════════ */}
          {mode === 'day' && (
            <View style={styles.calendarContainer}>
              {/* Day of week labels */}
              <View style={styles.weekDaysRow}>
                {dayNames.map((dn, idx) => (
                  <Text key={idx} style={[styles.weekDayText, (idx === 0 || idx === 6) && styles.weekDayWeekend]} allowFontScaling={false}>
                    {dn}
                  </Text>
                ))}
              </View>

              {/* Day numbers grid */}
              <View style={styles.daysGrid}>
                {daysGrid.map((item, idx) => {
                  if (item.day === null) {
                    return <View key={`empty-${idx}`} style={styles.dayCellEmpty} />;
                  }

                  const isSelected =
                    item.date?.getDate() === selectedDate.getDate() &&
                    item.date?.getMonth() === selectedDate.getMonth() &&
                    item.date?.getFullYear() === selectedDate.getFullYear();

                  const isToday =
                    item.date?.getDate() === new Date().getDate() &&
                    item.date?.getMonth() === new Date().getMonth() &&
                    item.date?.getFullYear() === new Date().getFullYear();

                  return (
                    <TouchableOpacity
                      key={`day-${item.day}`}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        item.disabled && styles.dayCellDisabled,
                        isToday && !isSelected && styles.dayCellToday,
                      ]}
                      disabled={item.disabled}
                      activeOpacity={0.7}
                      onPress={() => item.date && handleSelectDay(item.date)}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          isSelected && styles.dayCellTextSelected,
                          item.disabled && styles.dayCellTextDisabled,
                          isToday && !isSelected && styles.dayCellTextToday,
                        ]}
                        allowFontScaling={false}
                      >
                        {item.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ══════════════ MONTH PICKER VIEW ══════════════ */}
          {mode === 'month' && (
            <View style={styles.monthGrid}>
              {monthNames.map((mName, mIdx) => {
                const isSelected = viewMonth === mIdx;
                return (
                  <TouchableOpacity
                    key={mIdx}
                    style={[styles.monthCell, isSelected && styles.monthCellSelected]}
                    onPress={() => {
                      setViewMonth(mIdx);
                      setMode('day');
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.monthCellText, isSelected && styles.monthCellTextSelected]} allowFontScaling={false}>
                      {mName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ══════════════ YEAR PICKER VIEW ══════════════ */}
          {mode === 'year' && (
            <ScrollView style={styles.yearScroll} showsVerticalScrollIndicator={true}>
              <View style={styles.yearGrid}>
                {years.map((y) => {
                  const isSelected = viewYear === y;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[styles.yearCell, isSelected && styles.yearCellSelected]}
                      onPress={() => {
                        setViewYear(y);
                        setMode('day');
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.yearCellText, isSelected && styles.yearCellTextSelected]} allowFontScaling={false}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Formatted Date Banner */}
          <View style={styles.formatPreviewRow}>
            <Ionicons name="calendar-outline" size={14} color="#0A5C53" />
            <Text style={styles.formatPreviewLabel}>
              {language === 'mr' ? 'निवडलेली तारीख (DD/MM/YYYY):' : language === 'hi' ? 'चयनित तिथि (DD/MM/YYYY):' : 'Selected Format (DD/MM/YYYY):'}
            </Text>
            <Text style={styles.formatPreviewValue}>{formattedSelected}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>{t('cancel') || 'रद्द करा'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.confirmBtnText}>
                {language === 'mr' ? 'तारीख निश्चित करा' : language === 'hi' ? 'तिथि चुनें' : 'Confirm Date'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateDisplayLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A5C53',
    marginTop: 2,
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  ageBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A5C53',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  navBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0A5C53',
  },
  monthArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarContainer: {
    marginVertical: 4,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  weekDayWeekend: {
    color: '#DC2626',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayCellEmpty: {
    width: 38,
    height: 38,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: '#0A5C53',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#0A5C53',
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayCellTextToday: {
    color: '#0A5C53',
    fontWeight: '800',
  },
  dayCellTextDisabled: {
    color: '#94A3B8',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    maxHeight: 240,
  },
  monthCell: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthCellSelected: {
    backgroundColor: '#0A5C53',
    borderColor: '#0A5C53',
  },
  monthCellText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  monthCellTextSelected: {
    color: '#FFFFFF',
  },
  yearScroll: {
    maxHeight: 240,
    marginVertical: 10,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  yearCell: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  yearCellSelected: {
    backgroundColor: '#0A5C53',
    borderColor: '#0A5C53',
  },
  yearCellText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  yearCellTextSelected: {
    color: '#FFFFFF',
  },
  formatPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    gap: 6,
  },
  formatPreviewLabel: {
    fontSize: 11.5,
    color: '#0A5C53',
    fontWeight: '600',
  },
  formatPreviewValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A5C53',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A5C53',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#0A5C53',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
