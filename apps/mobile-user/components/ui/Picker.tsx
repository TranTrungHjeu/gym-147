import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PickerItem {
  label: string;
  value: string | number;
}

interface PickerProps {
  selectedValue: string | number;
  onValueChange: (value: string | number) => void;
  items: PickerItem[];
  placeholder?: string;
  disabled?: boolean;
}

export const Picker: React.FC<PickerProps> = ({
  selectedValue,
  onValueChange,
  items,
  placeholder = 'Select an option',
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themedStyles = styles(theme);

  const selectedItem = items.find((item) => item.value === selectedValue);

  const handleSelect = (value: string | number) => {
    onValueChange(value);
    setIsOpen(false);
  };

  return (
    <>
      <Pressable
        style={[
          themedStyles.picker,
          {
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      >
        <Text
          style={[
            themedStyles.pickerText,
            {
              color: selectedItem
                ? theme.colors.text
                : theme.colors.textSecondary,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <ChevronDown
          size={20}
          color={disabled ? theme.colors.textSecondary : theme.colors.primary}
        />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.modalContent}>
            <View style={themedStyles.modalHeader}>
              <Text
                style={[Typography.h3, { color: theme.colors.text }]}
              >
                Select Option
              </Text>
              <TouchableOpacity
                style={themedStyles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <Text
                  style={[Typography.body, { color: theme.colors.primary }]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={themedStyles.optionsList}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item, index) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    themedStyles.optionItem,
                    {
                      backgroundColor:
                        item.value === selectedValue
                          ? theme.colors.primary + '10'
                          : 'transparent',
                    },
                    index === items.length - 1 && themedStyles.lastOption,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text
                    style={[
                      themedStyles.optionText,
                      {
                        color:
                          item.value === selectedValue
                            ? theme.colors.primary
                            : theme.colors.text,
                      },
                      item.value === selectedValue && Typography.bodyBold,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <View style={themedStyles.checkmark} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = (theme: any) =>
  StyleSheet.create({
    picker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      minHeight: 48,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    pickerText: {
      ...Typography.bodyRegular,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      maxHeight: '70%',
      minHeight: 200,
      backgroundColor: theme.colors.surface,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    closeButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    optionsList: {
      maxHeight: 300,
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    lastOption: {
      borderBottomWidth: 0,
    },
    optionText: {
      ...Typography.bodyRegular,
      flex: 1,
    },
    checkmark: {
      width: 20,
      height: 20,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default Picker;
