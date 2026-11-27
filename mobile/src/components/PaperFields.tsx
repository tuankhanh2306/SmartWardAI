import React from 'react';
import {View, Text, TextInput, Pressable} from 'react-native';
import {memberFields, paperInputs, type PaperDraft, type PaperForm} from '../core/paperForm';
type Props = { form: PaperForm; draft: PaperDraft; onChange: (next: PaperDraft) => void; married?: string; existing: string[]; address: string; fullName: string };
export function PaperFields({form, draft, onChange, married, existing, address, fullName}: Props) {
  const field = (key: string, label: string, value: string, change: (v:string) => void) => (
    <View key={key} style={{marginVertical:5}}><Text>{label}</Text><TextInput accessibilityLabel={label} style={{minHeight:46, borderWidth:1, borderColor:'#94a3b8', borderRadius:6, paddingHorizontal:12}} value={value} onChangeText={change}/></View>
  );
  return <View>
    {paperInputs(form, existing, married).map(([key,label]) => field(key,label,draft.fields[key] || '',value =>
      onChange({...draft,fields:{...draft.fields,[key]:value}})))}
    {form === 'TK-BTXH' && [ ['currentAddress','Dùng nơi thường trú',address], ['accountHolderName','Dùng tên người hưởng trợ cấp',fullName] ].filter(([, ,value]) => value?.trim()).map(([key,label,value]) => <Pressable key={key} accessibilityRole="button" style={{paddingVertical:10}} onPress={()=>onChange({...draft,fields:{...draft.fields,[key]:value}})}><Text>{label}</Text></Pressable>)}
    {form === 'CT01' && <View>
      {draft.members.map((member,i) => <View key={i}>
        <Text>Thành viên cùng thay đổi {i+1}</Text>
        {Object.entries(memberFields).map(([key,label]) => field(key,label,member[key] || '',value =>
          onChange({...draft,members:draft.members.map((m,j)=>j===i?{...m,[key]:value}:m)})))}
        <Pressable accessibilityRole="button" onPress={()=>onChange({...draft,members:draft.members.filter((_,j)=>j!==i)})}><Text>Bỏ thành viên {i+1}</Text></Pressable>
      </View>)}
      <Pressable accessibilityRole="button" onPress={()=>onChange({...draft,members:[...draft.members,{}]})}><Text>+ Thêm thành viên cùng thay đổi</Text></Pressable>
    </View>}
  </View>;
}
