import type { SubLot, SubLotInput } from "@/entities/SubLot/subLot";
import {
  centsToYuanString,
  yuanStringToCents,
} from "@/shared/lib/format";

export interface SubLotFormValues {
  name: string;
  estimatedAmount?: string | null;
  estimatedAmountNote?: string | null;
  maxPrice?: string | null;
  maxPriceNote?: string | null;
  deposit?: string | null;
  depositNote?: string | null;
  qualifications?: string[];
}

function cleanOptionalText(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned || null;
}

export function subLotValuesToInput(values: SubLotFormValues): SubLotInput {
  return {
    name: values.name.trim(),
    estimatedAmount: yuanStringToCents(values.estimatedAmount),
    estimatedAmountNote: cleanOptionalText(values.estimatedAmountNote),
    maxPrice: yuanStringToCents(values.maxPrice),
    maxPriceNote: cleanOptionalText(values.maxPriceNote),
    deposit: yuanStringToCents(values.deposit),
    depositNote: cleanOptionalText(values.depositNote),
    qualifications: (values.qualifications ?? [])
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

export function subLotToFormValues(subLot: SubLot): SubLotFormValues {
  return {
    name: subLot.name,
    estimatedAmount: centsToYuanString(subLot.estimatedAmount),
    estimatedAmountNote: subLot.estimatedAmountNote,
    maxPrice: centsToYuanString(subLot.maxPrice),
    maxPriceNote: subLot.maxPriceNote,
    deposit: centsToYuanString(subLot.deposit),
    depositNote: subLot.depositNote,
    qualifications: subLot.qualifications,
  };
}
