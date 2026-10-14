import type { TFunction } from 'i18next';
import type { SideNavSection } from '../Common/SideNav';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconMenuContacts from '../Icon/Menu/IconMenuContacts';
import IconMenuUsers from '../Icon/Menu/IconMenuUsers';
import IconMenuAuthentication from '../Icon/Menu/IconMenuAuthentication';
import IconUsersGroup from '../Icon/IconUsersGroup';

export const masterScopeLabel = (t: TFunction) => t('Master Console');

export const buildMasterNav = (t: TFunction): SideNavSection[] => [
    { items: [{ label: t('Dashboard'), to: '/master/dashboard', end: true, icon: <IconMenuDashboard /> }] },
    {
        title: t('Platform'),
        items: [
            { label: t('Company'), to: '/master/company', icon: <IconMenuContacts /> },
            { label: t('Employees'), to: '/master/employee', icon: <IconUsersGroup /> },
            { label: t('User Management'), to: '/master/user-management', icon: <IconMenuUsers /> },
            { label: t('Administrators'), to: '/master/administration', icon: <IconMenuAuthentication /> },
        ],
    },
];
