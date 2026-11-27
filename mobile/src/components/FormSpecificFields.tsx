/**
 * SmartWard AI Mobile — Các Trường Đặc Thù Của 4 Nhóm Tờ Khai (MOB-3.8 -> MOB-3.11)
 * 1. CT01    — Cư trú (TT 116/2026/TT-BCA): CCCD chủ hộ, ngày sinh chủ hộ, xác nhận VNeID
 * 2. TK-KS   — Khai sinh (TT 04/2020/TT-BTP): Đối chiếu Giấy chứng sinh, hôn nhân cha mẹ
 * 3. TK-KH   — Kết hôn & Độc thân (Luật HN&GĐ 2014): Bên kết hôn thứ 2, mục đích rõ ràng
 * 4. TK-BTXH — Bảo trợ XH (NĐ 20/2021 & NĐ 335/2026): Diện hộ, khuyết tật, STK ngân hàng Đề án 06
 */

import React from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';
import { formatDmyDateInput } from '../core/formValidators';
import type { CoreFormType } from '../types/api.types';

export interface FormExtraState {
  // CT01
  hostFullName: string;
  hostCccdNumber: string;
  hostDateOfBirth: string;
  vneidHostConfirmed: boolean;

  // TK-KS
  motherName: string;
  fatherName: string;
  hospitalBirthDate: string;
  hospitalMotherName: string;
  parentsMarried: 'YES' | 'NO';

  // TK-KH
  marriageMode: 'MARRIAGE_REGISTRATION' | 'MARITAL_STATUS_CONFIRMATION';
  partnerFullName: string;
  partnerCccd: string;
  partnerDob: string;
  partnerGender: 'Nam' | 'Nữ';
  maritalCertPurpose: string;

  // TK-BTXH
  householdStatus: 'NORMAL' | 'POOR' | 'NEAR_POOR';
  disabilityLevel: 'NONE' | 'MILD' | 'SEVERE' | 'EXTREMELY_SEVERE';
  bankAccount: string;
  bankName: string;
}

export const INITIAL_FORM_EXTRA: FormExtraState = {
  hostFullName: '',
  hostCccdNumber: '',
  hostDateOfBirth: '',
  vneidHostConfirmed: false,

  motherName: '',
  fatherName: '',
  hospitalBirthDate: '',
  hospitalMotherName: '',
  parentsMarried: 'YES',

  marriageMode: 'MARRIAGE_REGISTRATION',
  partnerFullName: '',
  partnerCccd: '',
  partnerDob: '',
  partnerGender: 'Nữ',
  maritalCertPurpose: '',

  householdStatus: 'NORMAL',
  disabilityLevel: 'NONE',
  bankAccount: '',
  bankName: '',
};

export interface FormSpecificFieldsProps {
  formType: CoreFormType;
  extra: FormExtraState;
  onChange: <K extends keyof FormExtraState>(key: K, value: FormExtraState[K]) => void;
}

export const FormSpecificFields: React.FC<FormSpecificFieldsProps> = ({
  formType,
  extra,
  onChange,
}) => {
  const { typography } = useAccessibility();

  if (formType === 'CT01') {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, typography.bodyBold]}>
          Thông tin Chủ hộ (Mẫu CT01)
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>Họ tên Chủ hộ</Text>
          <TextInput
            value={extra.hostFullName}
            onChangeText={(v) => onChange('hostFullName', v)}
            placeholder="VD: NGUYỄN VĂN HÙNG"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>
            Số CCCD Chủ hộ (12 chữ số) *
          </Text>
          <TextInput
            value={extra.hostCccdNumber}
            onChangeText={(v) => onChange('hostCccdNumber', v.replace(/[^0-9]/g, '').slice(0, 12))}
            keyboardType="number-pad"
            maxLength={12}
            placeholder="Nhập 12 số CCCD chủ hộ"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>
            Ngày sinh Chủ hộ (DD-MM-YYYY, ≥ 18 tuổi)
          </Text>
          <TextInput
            value={extra.hostDateOfBirth}
            onChangeText={(v) => onChange('hostDateOfBirth', formatDmyDateInput(v))}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="10-03-1975"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, typography.bodyMd]}>
            Chủ hộ đã xác nhận đồng ý qua VNeID
          </Text>
          <Switch
            value={extra.vneidHostConfirmed}
            onValueChange={(v) => onChange('vneidHostConfirmed', v)}
            trackColor={{ false: COLORS.borderDefault, true: COLORS.primaryBorder }}
            thumbColor={extra.vneidHostConfirmed ? COLORS.primary : COLORS.card}
          />
        </View>
      </View>
    );
  }

  if (formType === 'TK-KS') {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, typography.bodyBold]}>
          Đối chiếu Giấy chứng sinh &amp; Cha Mẹ (TK-KS)
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>Họ tên Mẹ trên tờ khai *</Text>
          <TextInput
            value={extra.motherName}
            onChangeText={(v) => onChange('motherName', v)}
            placeholder="VD: TRẦN THỊ MAI"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>
            Họ tên Mẹ trên Giấy chứng sinh (đối chiếu chéo)
          </Text>
          <TextInput
            value={extra.hospitalMotherName}
            onChangeText={(v) => onChange('hospitalMotherName', v)}
            placeholder="Ghi giống Giấy chứng sinh bệnh viện"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>
            Ngày sinh trên Giấy chứng sinh (DD-MM-YYYY)
          </Text>
          <TextInput
            value={extra.hospitalBirthDate}
            onChangeText={(v) => onChange('hospitalBirthDate', formatDmyDateInput(v))}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="25-10-2026"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, typography.bodyMd]}>
            Cha mẹ đã đăng ký kết hôn
          </Text>
          <Switch
            value={extra.parentsMarried === 'YES'}
            onValueChange={(v) => onChange('parentsMarried', v ? 'YES' : 'NO')}
            trackColor={{ false: COLORS.borderDefault, true: COLORS.primaryBorder }}
            thumbColor={extra.parentsMarried === 'YES' ? COLORS.primary : COLORS.card}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>
            Họ tên Cha {extra.parentsMarried === 'NO' ? '(để trống nếu chưa làm nhận cha con)' : ''}
          </Text>
          <TextInput
            value={extra.fatherName}
            onChangeText={(v) => onChange('fatherName', v)}
            placeholder="VD: NGUYỄN VĂN HÙNG"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>
      </View>
    );
  }

  if (formType === 'TK-KH') {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, typography.bodyBold]}>
          Bên kết hôn thứ 2 &amp; Mục đích xác nhận (TK-KH)
        </Text>

        <View style={styles.chipGroupRow}>
          {(['MARRIAGE_REGISTRATION','MARITAL_STATUS_CONFIRMATION'] as const).map(mode =>
            <Pressable key={mode} onPress={() => onChange('marriageMode',mode)} style={[styles.chipBtn,extra.marriageMode === mode && styles.chipBtnActive]}>
              <Text>{mode === 'MARRIAGE_REGISTRATION' ? 'Đăng ký kết hôn' : 'Xác nhận tình trạng hôn nhân'}</Text>
            </Pressable>)}
        </View>
        {extra.marriageMode === 'MARRIAGE_REGISTRATION' && <>
        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>Họ tên bên kết hôn thứ 2</Text>
          <TextInput
            value={extra.partnerFullName}
            onChangeText={(v) => onChange('partnerFullName', v)}
            placeholder="VD: LÊ THỊ HOA"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>
            Ngày sinh bên thứ 2 (DD-MM-YYYY • Nam ≥ 20, Nữ ≥ 18)
          </Text>
          <TextInput
            value={extra.partnerDob}
            onChangeText={(v) => onChange('partnerDob', formatDmyDateInput(v))}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="12-05-2004"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        <View style={styles.chipGroupRow}>
          {(['Nam', 'Nữ'] as const).map((g) => {
            const active = extra.partnerGender === g;
            return (
              <Pressable
                key={g}
                onPress={() => onChange('partnerGender', g)}
                style={[styles.chipBtn, active && styles.chipBtnActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  Bên thứ 2: {g}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>
            Số CCCD bên thứ 2 (12 số, không trùng)
          </Text>
          <TextInput
            value={extra.partnerCccd}
            onChangeText={(v) => onChange('partnerCccd', v.replace(/[^0-9]/g, '').slice(0, 12))}
            keyboardType="number-pad"
            maxLength={12}
            placeholder="Nhập 12 số CCCD"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>

        </>}
        {extra.marriageMode === 'MARITAL_STATUS_CONFIRMATION' && <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>
            Mục đích cấp Giấy xác nhận tình trạng hôn nhân *
          </Text>
          <TextInput
            value={extra.maritalCertPurpose}
            onChangeText={(v) => onChange('maritalCertPurpose', v)}
            placeholder="VD: Để đăng ký kết hôn với chị Lê Thị Hoa tại UBND Phường Long Xuyên"
            placeholderTextColor={COLORS.textMuted}
            multiline
            style={[styles.input, styles.multilineInput, typography.bodyMd]}
          />
        </View>}
      </View>
    );
  }

  // TK-BTXH
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, typography.bodyBold]}>
        Điều kiện Bảo trợ &amp; Tài khoản Đề án 06 (TK-BTXH)
      </Text>

      <Text style={[styles.label, typography.captionSm]}>Hoàn cảnh hộ gia đình</Text>
      <View style={styles.chipGroupRow}>
        {(
          [
            { key: 'NORMAL', label: 'Thường' },
            { key: 'POOR', label: 'Hộ nghèo' },
            { key: 'NEAR_POOR', label: 'Cận nghèo' },
          ] as const
        ).map((item) => {
          const active = extra.householdStatus === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange('householdStatus', item.key)}
              style={[styles.chipBtn, active && styles.chipBtnActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, typography.captionSm]}>Mức độ khuyết tật</Text>
      <View style={styles.chipGroupRow}>
        {(
          [
            { key: 'NONE', label: 'Không' },
            { key: 'SEVERE', label: 'Nặng' },
            { key: 'EXTREMELY_SEVERE', label: 'Đặc biệt nặng' },
          ] as const
        ).map((item) => {
          const active = extra.disabilityLevel === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange('disabilityLevel', item.key)}
              style={[styles.chipBtn, active && styles.chipBtnActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, typography.captionSm]}>
          Số tài khoản ngân hàng nhận trợ cấp *
        </Text>
        <TextInput
          value={extra.bankAccount}
          onChangeText={(v) => onChange('bankAccount', v.replace(/[^0-9A-Za-z]/g, '').slice(0, 20))}
          keyboardType="number-pad"
          placeholder="Nhập 8–20 số tài khoản chính chủ"
          placeholderTextColor={COLORS.textMuted}
          style={[styles.input, typography.bodyMd]}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, typography.captionSm]}>Tên ngân hàng</Text>
        <TextInput
          value={extra.bankName}
          onChangeText={(v) => onChange('bankName', v)}
          placeholder="VD: Agribank, Vietcombank, BIDV..."
          placeholderTextColor={COLORS.textMuted}
          style={[styles.input, typography.bodyMd]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
  },
  field: {
    gap: 4,
  },
  label: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  input: {
    minHeight: MIN_TOUCH_TARGET - 4,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    color: COLORS.textPrimary,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  switchRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  switchLabel: {
    color: COLORS.textPrimary,
    flex: 1,
  },
  chipGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipBtn: {
    minHeight: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mutedSurface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    justifyContent: 'center',
  },
  chipBtnActive: {
    backgroundColor: COLORS.citizenCrimson,
    borderColor: COLORS.citizenCrimson,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.onPrimary,
  },
});
