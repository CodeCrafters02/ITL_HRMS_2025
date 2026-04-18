import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import CompanyGoogleCalendar from '../../components/Calendar/CompanyGoogleCalendar';

const AdminCalendar = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Calendar'));
    }, [dispatch]);

    return <CompanyGoogleCalendar variant="page" />;
};

export default AdminCalendar;
