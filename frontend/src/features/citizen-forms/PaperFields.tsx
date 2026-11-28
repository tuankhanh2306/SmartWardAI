import { memberFields, paperInputs, type PaperDraft, type PaperForm } from './paperForm';
type Props = {
  form: PaperForm;
  draft: PaperDraft;
  onChange: (next: PaperDraft) => void;
  married?: string;
  existing: string[];
  address: string;
  fullName: string;
};
export function PaperFields({ form, draft, onChange, married, existing, address, fullName }: Props) {
  const field = (key: string, label: string, value: string, change: (v: string) => void) => (
    <label key={key} className="flex flex-col gap-1 text-sm">
      {label}
      <input
        className="rounded border border-slate-300 px-3 py-2"
        value={value}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {paperInputs(form, existing, married).map(([key, label]) =>
        field(key, label, draft.fields[key] || '', (value) =>
          onChange({ ...draft, fields: { ...draft.fields, [key]: value } }),
        ),
      )}
      {form === 'TK-BTXH' &&
        [
          ['currentAddress', 'Dùng nơi thường trú', address],
          ['accountHolderName', 'Dùng tên người hưởng trợ cấp', fullName],
        ]
          .filter(([, , value]) => value?.trim())
          .map(([key, label, value]) => (
            <button
              key={key}
              type="button"
              className="text-sm text-left underline"
              onClick={() => onChange({ ...draft, fields: { ...draft.fields, [key]: value } })}
            >
              {label}
            </button>
          ))}
      {form === 'CT01' && (
        <div>
          {draft.members.map((member, i) => (
            <div key={i}>
              <span>Thành viên cùng thay đổi {i + 1}</span>
              {Object.entries(memberFields).map(([key, label]) =>
                field(key, label, member[key] || '', (value) =>
                  onChange({
                    ...draft,
                    members: draft.members.map((m, j) => (j === i ? { ...m, [key]: value } : m)),
                  }),
                ),
              )}
              <button
                type="button"
                onClick={() => onChange({ ...draft, members: draft.members.filter((_, j) => j !== i) })}
              >
                <span>Bỏ thành viên {i + 1}</span>
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...draft, members: [...draft.members, {}] })}>
            <span>+ Thêm thành viên cùng thay đổi</span>
          </button>
        </div>
      )}
    </div>
  );
}
