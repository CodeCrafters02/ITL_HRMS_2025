import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg, EventContentArg, DayCellContentArg } from "@fullcalendar/core";
// Inline Modal implementation for this file
function Modal({ isOpen, onClose, className = '', children }: { isOpen: boolean; onClose: () => void; className?: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg ${className} relative`}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 focus:outline-none"
          aria-label="Close"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
        <div className="p-2 sm:p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
import { useModal } from "../../hooks/useModal";
import PageMeta from "../../components/common/PageMeta";
import { axiosInstance } from "../Dashboard/api";

interface CalendarEvent extends EventInput {
  id?: string;
  name: string;
  date: string;
  description?: string;
  is_holiday?: boolean;
}

const AdminCalendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventIsHoliday, setEventIsHoliday] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get("/calendar-events/");
      setEvents(
        response.data.map((ev: CalendarEvent) => ({
          id: String(ev.id),
          name: ev.name,
          date: ev.date,
          description: ev.description,
          is_holiday: ev.is_holiday,
          title: ev.name, // For FullCalendar display
          start: ev.date, // For FullCalendar
          allDay: true,
        }))
      );
    } catch {
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !selectedEvent.id) return;
    setLoading(true);
    setError(null);
    try {
      await axiosInstance.delete(`/calendar-events/${selectedEvent.id}/`);
      fetchEvents();
      closeModal();
      resetModalFields();
    } catch {
      setError("Failed to delete event");
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventDate(selectInfo.startStr);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEvent(event as unknown as CalendarEvent);
    setEventName(event.title);
    setEventDate(event.start?.toISOString().split("T")[0] || "");
    setEventDescription(event.extendedProps.description || "");
    setEventIsHoliday(!!event.extendedProps.is_holiday);
    openModal();
  };

  const handleAddOrUpdateEvent = async () => {
    setLoading(true);
    setError(null);
    try {
      if (selectedEvent && selectedEvent.id) {
        // Update existing event
        await axiosInstance.put(`/calendar-events/${selectedEvent.id}/`, {
          name: eventName,
          date: eventDate,
          description: eventDescription,
          is_holiday: eventIsHoliday,
        });
      } else {
        // Add new event
        await axiosInstance.post(`/calendar-events/`, {
          name: eventName,
          date: eventDate,
          description: eventDescription,
          is_holiday: eventIsHoliday,
        });
      }
      fetchEvents();
      closeModal();
      resetModalFields();
    } catch {
      setError("Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  const resetModalFields = () => {
    setEventName("");
    setEventDate("");
    setEventDescription("");
    setEventIsHoliday(false);
    setSelectedEvent(null);
  };

  // Render event content for FullCalendar
  const renderEventContent = (eventInfo: EventContentArg) => {
    const isHoliday = eventInfo.event.extendedProps.is_holiday;
    return (
      <div className="event-fc-color flex fc-event-main p-1 rounded-sm items-center">
        <div className="fc-event-time" style={{marginRight: 6}}>{eventInfo.timeText}</div>
        <div className="fc-event-title flex items-center">
          {!isHoliday && (
            <span role="img" aria-label="calendar" style={{marginRight: 6}}>📅</span>
          )}
          <span>{eventInfo.event.title}</span>
        </div>
      </div>
    );
  };

  // Render badge/mark on days with events or holidays
  const renderDayCellContent = (arg: DayCellContentArg) => {
    const dateStr = arg.date.toISOString().split('T')[0];
    // Check if there is a holiday event on this date
    const isHoliday = events.some(ev => ev.date === dateStr && ev.is_holiday);
    // Check if there is any event (non-holiday)
    const hasEvent = events.some(ev => ev.date === dateStr && !ev.is_holiday);
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <span style={isHoliday ? { color: '#ef4444', fontWeight: 'bold' } : {}}>{arg.dayNumberText}</span>
      </div>
    );
  };
  return (
    <>
      <PageMeta title="Admin Calendar" description="Admin Calendar" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {error && <div className="text-red-600 p-2">{error}</div>}
        {loading && <div className="text-gray-500 p-2">Loading...</div>}
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next addEventButton",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            dayCellContent={renderDayCellContent}
            customButtons={{
              addEventButton: {
                text: "Add Event +",
                click: () => {
                  resetModalFields();
                  openModal();
                },
              },
            }}
          />
        </div>
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] p-6 lg:p-10"
        >
          <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
            <div>
              <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                {selectedEvent ? "Edit Event" : "Add Event"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Plan your next big moment: schedule or edit an event to stay on track
              </p>
            </div>
            <div className="mt-8">
              <div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Event Name
                  </label>
                  <input
                    id="event-name"
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
                <div className="mt-6">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Description
                  </label>
                  <textarea
                    id="event-description"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    rows={3}
                  />
                </div>
                <div className="mt-6 flex items-center">
                  <input
                    id="event-is-holiday"
                    type="checkbox"
                    checked={eventIsHoliday}
                    onChange={(e) => setEventIsHoliday(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="event-is-holiday" className="text-sm font-medium text-gray-700 dark:text-gray-400">
                    Is Holiday
                  </label>
                </div>
              </div>
              {/* Removed Event Color selection, not in backend model */}

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Event Date
                </label>
                <div className="relative">
                  <input
                    id="event-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
              <button
                onClick={closeModal}
                type="button"
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
              >
                Close
              </button>
              {selectedEvent && selectedEvent.id && (
                <button
                  onClick={handleDeleteEvent}
                  type="button"
                  className="btn btn-danger flex w-full justify-center rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 sm:w-auto"
                  disabled={loading}
                >
                  Delete
                </button>
              )}
              <button
                onClick={handleAddOrUpdateEvent}
                type="button"
                className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
                disabled={loading}
              >
                {selectedEvent ? "Update Changes" : "Add Event"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default AdminCalendar;
