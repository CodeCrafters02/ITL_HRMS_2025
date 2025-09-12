import * as React from 'react';
import  { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

interface Props {
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  label?: string;
  id?: string;
}

const CustomTimePicker: React.FC<Props> = ({ value, onChange, label = 'Select Time', id }) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <TimePicker
        label={label}
        value={value}
        onChange={onChange}
        ampm={false}
        slotProps={{ textField: { id, fullWidth: true, size: 'small' } }}
      />
    </LocalizationProvider>
  );
};

export default CustomTimePicker;
