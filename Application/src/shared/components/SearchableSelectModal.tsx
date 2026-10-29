import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

export interface SelectItem {
  id?: string;
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  items: Array<string | SelectItem>;
  selectedValue?: string;
  onSelect: (item: string) => void;
  onSelectObject?: (item: SelectItem) => void;
  onClose: () => void;
  /**
   * If true, uses prefix matching (item startsWith query).
   * Default: true.
   */
  prefixMatch?: boolean;
}

export const SearchableSelectModal: React.FC<SearchableSelectModalProps> = ({
  visible,
  title,
  placeholder,
  items,
  selectedValue = '',
  onSelect,
  onSelectObject,
  onClose,
  prefixMatch = true,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const activePlaceholder = placeholder || t('searchAppPlaceholder') || 'Type to search...';

  // Reset search query when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
    }
  }, [visible]);

  // Normalize items to structured shape internally
  const normalizedItems = useMemo<SelectItem[]>(() => {
    return items.map((it) => {
      if (typeof it === 'string') {
        return { value: it, label: it };
      }
      return it;
    });
  }, [items]);

  // Filter items by prefix or includes across label and subLabel
  const filteredItems = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) return normalizedItems;

    return normalizedItems.filter((item) => {
      const labelLower = item.label.toLowerCase();
      const subLabelLower = item.subLabel ? item.subLabel.toLowerCase() : '';
      const valLower = item.value.toLowerCase();

      if (prefixMatch) {
        return (
          labelLower.startsWith(cleanQuery) ||
          subLabelLower.startsWith(cleanQuery) ||
          valLower.startsWith(cleanQuery) ||
          labelLower.includes(cleanQuery) ||
          subLabelLower.includes(cleanQuery)
        );
      }
      return (
        labelLower.includes(cleanQuery) ||
        subLabelLower.includes(cleanQuery) ||
        valLower.includes(cleanQuery)
      );
    });
  }, [normalizedItems, searchQuery, prefixMatch]);

  const handleItemPress = (item: SelectItem) => {
    onSelect(item.value);
    if (onSelectObject) {
      onSelectObject(item);
    }
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Ionicons name="location-outline" size={20} color={colors.citizen.primary} />
              <Text style={styles.modalTitle}>{title}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#7A8B88" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={activePlaceholder}
              placeholderTextColor="#9EAFA8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={18} color="#9EAFA8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Items List */}
          <FlatList
            data={filteredItems}
            keyExtractor={(item, index) => `${item.id || item.value}_${index}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const cleanSelected = (selectedValue || '').trim().toLowerCase();
              const isSelected =
                cleanSelected.length > 0 &&
                (cleanSelected === item.value.toLowerCase() ||
                  cleanSelected === item.label.toLowerCase() ||
                  (item.id && cleanSelected === item.id.toLowerCase()));
              return (
                <TouchableOpacity
                  style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemTextContainer}>
                    <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                      {item.label}
                    </Text>
                    {!!item.subLabel && (
                      <Text style={styles.itemSubText}>{item.subLabel}</Text>
                    )}
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.citizen.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={32} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>{t('noMatchingLocations')}</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? `${t('noEntriesFound')} ("${searchQuery}")` : t('noEntriesFound')}
                </Text>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    minHeight: '45%',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginHorizontal: 18,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 8,
  },
  itemRowSelected: {
    backgroundColor: '#F0FDF4',
  },
  itemTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  itemTextSelected: {
    color: colors.citizen.primary,
    fontWeight: '700',
  },
  itemSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '400',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
});

export default SearchableSelectModal;
