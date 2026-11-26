import React from 'react';
import { ArrowRight, Check, ChevronRight, PenTool, ShieldCheck, Upload } from 'lucide-react';

interface FormWizardStepperProps {
  formWizardStep: 1 | 2 | 3;
  hasPrecheckResult: boolean;
  onStepClick: (step: 1 | 2 | 3) => void;
}

const STEPS = [
  { step: 1 as const, label: 'Bước 1', title: 'Chọn mẫu & tải ảnh', Icon: Upload },
  { step: 2 as const, label: 'Bước 2', title: 'Nhập tờ khai', Icon: PenTool },
  { step: 3 as const, label: 'Bước 3', title: 'Kết quả & In A4', Icon: ShieldCheck },
];

export const FormWizardStepper: React.FC<FormWizardStepperProps> = ({
  formWizardStep,
  hasPrecheckResult,
  onStepClick,
}) => (
  <nav
    aria-label="Quy trình tiền kiểm tra tờ khai 3 bước"
    className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs p-2.5 sm:p-3"
  >
    <ol className="flex flex-col sm:flex-row sm:items-stretch gap-2">
      {STEPS.map((s, idx, arr) => {
        const isCurrent = formWizardStep === s.step;
        const isDone = formWizardStep > s.step || (s.step === 3 && hasPrecheckResult);
        const StepIcon = isDone && !isCurrent ? Check : s.Icon;
        const isStep3Disabled = s.step === 3 && !hasPrecheckResult;
        return (
          <React.Fragment key={s.step}>
            <li className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onStepClick(s.step)}
                aria-current={isCurrent ? 'step' : undefined}
                title={
                  isStep3Disabled
                    ? 'Vui lòng hoàn tất nhập thông tin và bấm "Kiểm tra & tiếp tục" ở Bước 2'
                    : undefined
                }
                className={`w-full h-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition gov-focus-ring ${
                  isCurrent
                    ? 'bg-[#B90E23] text-white border-[#8F0A1B] shadow-xs cursor-default'
                    : isDone
                    ? 'bg-[#F0FDF4] text-[#065F46] border-[#A7F3D0] hover:bg-[#DCFCE7] cursor-pointer'
                    : isStep3Disabled
                    ? 'bg-[#F8FAFC] text-slate-400 border-slate-200 cursor-not-allowed opacity-80'
                    : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9] cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : isDone
                        ? 'bg-[#065F46] text-white'
                        : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    <StepIcon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <span
                      className={`block text-[10px] font-bold uppercase tracking-wider ${
                        isCurrent ? 'text-amber-100' : 'text-[#475569]'
                      }`}
                    >
                      {s.label}
                    </span>
                    <span className="block text-xs font-bold truncate">{s.title}</span>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 shrink-0 sm:hidden ${
                    isCurrent ? 'text-amber-200' : isDone ? 'text-[#065F46]' : 'text-slate-400'
                  }`}
                />
              </button>
            </li>
            {idx < arr.length - 1 && (
              <li aria-hidden="true" className="hidden sm:flex items-center justify-center px-0.5 shrink-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    formWizardStep > s.step
                      ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#065F46]'
                      : isCurrent
                      ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B90E23]'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </li>
            )}
          </React.Fragment>
        );
      })}
    </ol>
  </nav>
);
