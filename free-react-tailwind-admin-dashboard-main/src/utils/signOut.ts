import Swal from 'sweetalert2';
import { clearAllSessionData } from './sessionManager';

/** Asks for confirmation, then clears the session. Resolves to true when the user was signed out. */
export const confirmSignOut = async (): Promise<boolean> => {
    const result = await Swal.fire({
        icon: 'question',
        title: 'Sign out?',
        text: 'You will need to sign in again to continue.',
        showCancelButton: true,
        confirmButtonText: 'Sign out',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        customClass: { popup: 'sweet-alerts' },
        padding: '2em',
    });
    if (!result.isConfirmed) return false;
    clearAllSessionData();
    return true;
};
