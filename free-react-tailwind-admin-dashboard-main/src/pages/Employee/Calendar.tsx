import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import CompanyMicrosoftCalendar from '../../components/Calendar/CompanyMicrosoftCalendar';

const EmployeeCalendar = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Calendar'));
    }, [dispatch]);

    return <CompanyMicrosoftCalendar variant="page" />;
};

export default EmployeeCalendar;
