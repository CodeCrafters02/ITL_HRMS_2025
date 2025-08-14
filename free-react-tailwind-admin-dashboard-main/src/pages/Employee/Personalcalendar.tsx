import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import PageMeta from "../../components/common/PageMeta";
import DatePicker from "../../components/form/date-picker";
import { axiosInstance } from "./api";

interface CalendarEvent extends EventInput {
  id: string;
  title: string;
  start: string;
  end?: string;
  extendedProps: {
    description?: string;
    type: 'personal' | 'admin';
  };
}

const PersonalCalendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const response = await axiosInstance.get('/employee-calendar/', {
        params: {
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          day: today.getDate()
        }
      });

      const calendarEvents: CalendarEvent[] = [];
      
      response.data.weeks.forEach((week: { day: string; date: string; personal_events: { id: number; name?: string; title?: string; description?: string }[]; admin_events: { id: number; name?: string; title?: string }[] }[]) => {
        week.forEach((day) => {
          if (day.day) {
            // Add personal events
            day.personal_events.forEach((event) => {
              calendarEvents.push({
                id: `personal-${event.id}`,
                title: event.name || event.title || '',
                start: day.date,
                extendedProps: {
                  type: 'personal',
                  description: event.description
                }
              });
            });

            // Add admin events
            day.admin_events.forEach((event) => {
              calendarEvents.push({
                id: `admin-${event.id}`,
                title: event.name || event.title || '',
                start: day.date,
                extendedProps: {
                  type: 'admin'
                }
              });
            });
          }
        });
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
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
    
    // Only allow editing personal events
    if (event.id && event.id.startsWith('personal-')) {
      setSelectedEvent(event as unknown as CalendarEvent);
      setEventName(event.title);
      setEventDate(event.start?.toISOString().split("T")[0] || "");
      setEventDescription(event.extendedProps.description || "");
      openModal();
    }
  };

  const handleAddOrUpdateEvent = async () => {
    if (!eventName.trim() || !eventDate.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      if (selectedEvent && selectedEvent.id.startsWith('personal-')) {
        // Update existing personal event
        const eventId = selectedEvent.id.replace('personal-', '');
        await axiosInstance.put(`/employee-calendar/${eventId}/`, {
          name: eventName,
          date: eventDate,
          description: eventDescription
        });

        // Update local state
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event.id === selectedEvent.id
              ? {
                  ...event,
                  title: eventName,
                  start: eventDate,
                  extendedProps: {
                    type: 'personal' as const,
                    description: eventDescription
                  }
                }
              : event
          )
        );
      } else {
        // Add new personal event
        const response = await axiosInstance.post('/employee-calendar/', {
          name: eventName,
          date: eventDate,
          description: eventDescription
        });

        const newEvent: CalendarEvent = {
          id: `personal-${response.data.id}`,
          title: eventName,
          start: eventDate,
          extendedProps: {
            type: 'personal' as const,
            description: eventDescription
          }
        };
        setEvents((prevEvents) => [...prevEvents, newEvent]);
      }

      closeModal();
      resetModalFields();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Error saving event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetModalFields = () => {
    setEventName("");
    setEventDate("");
    setEventDescription("");
    setSelectedEvent(null);
  };

  return (
    <>
      <PageMeta
        title="Personal Calendar | HRMS Employee Dashboard"
        description="Manage your personal events, appointments, and schedule"
      />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
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
            customButtons={{
              addEventButton: {
                text: "Add Personal Event +",
                click: openModal,
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
                {selectedEvent ? "Edit Personal Event" : "Add Personal Event"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your personal schedule: add appointments, reminders, and important dates
              </p>
            </div>
            <div className="mt-8">
              <div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Event Title *
                  </label>
                  <input
                    id="event-title"
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    placeholder="Enter event title..."
                    required
                  />
                </div>
              </div>

              <div className="mt-6">
                <DatePicker
                  id="event-date"
                  label="Event Date *"
                  placeholder="Select event date"
                  defaultDate={eventDate || undefined}
                  onChange={(_selectedDates, dateStr) => {
                    setEventDate(dateStr);
                  }}
                />
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Description (Optional)
                </label>
                <textarea
                  id="event-description"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  rows={3}
                  className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  placeholder="Enter event description..."
                />
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
              <button
                onClick={handleAddOrUpdateEvent}
                type="button"
                disabled={loading}
                className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
              >
                {loading ? 'Saving...' : (selectedEvent ? "Update Event" : "Add Event")}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

const renderEventContent = (eventInfo: { event: { title: string; extendedProps: { type: 'personal' | 'admin'; description?: string }; }; timeText: string; }) => {
  const isPersonal = eventInfo.event.extendedProps.type === 'personal';
  const colorClass = isPersonal ? 'fc-bg-primary' : 'fc-bg-success';
  const textColor = isPersonal ? 'text-blue-700' : 'text-green-700';
  
  return (
    <div className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}>
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className={`fc-event-title ${textColor} font-medium`}>
        {isPersonal ? '📅 ' : '🏢 '}{eventInfo.event.title}
      </div>
    </div>
  );
};

export default PersonalCalendar;
