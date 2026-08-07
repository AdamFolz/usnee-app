import { useState } from 'react';
import AdvancedRecordForm from '../components/record/AdvancedRecordForm';
import { QuickRecordScreen } from '../components/record/QuickRecordScreen';

export default function AddEntry() {
  const [advanced, setAdvanced] = useState(false);
  return advanced ? <AdvancedRecordForm /> : <QuickRecordScreen onAdvanced={() => setAdvanced(true)} />;
}
