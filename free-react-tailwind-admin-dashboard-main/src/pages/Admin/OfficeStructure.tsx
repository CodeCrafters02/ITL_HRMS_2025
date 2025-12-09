import { useState, useEffect, useRef } from 'react';
import { axiosInstance } from '../Dashboard/api';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';

interface Floor {
    id: number;
    name: string;
    floor_number: number;
    description: string;
    sections: Section[];
}

interface Section {
    id: number;
    name: string;
    department: number | null;
    department_name: string | null;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    color: string;
    seats: Seat[];
    floor: number;
    rotation?: number;
}

interface Seat {
    id: number;
    seat_number: string;
    employee: number | null;
    employee_details: any;
    position_x: number;
    position_y: number;
    is_available: boolean;
    section: number;
    rotation?: number; // Rotation angle in degrees
}

interface Department {
    id: number;
    department_name: string;
}

const OfficeStructure = () => {
    const [floors, setFloors] = useState<Floor[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFloorModal, setShowFloorModal] = useState(false);
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [showAddDeskModal, setShowAddDeskModal] = useState(false);
    const [selectedSectionForDesk, setSelectedSectionForDesk] = useState<Section | null>(null);
    const [newDeskName, setNewDeskName] = useState('');
    const [draggingSection, setDraggingSection] = useState<Section | null>(null);
    const [resizingSection, setResizingSection] = useState<Section | null>(null);
    const [draggingSeat, setDraggingSeat] = useState<Seat | null>(null);
    const [editingSeat, setEditingSeat] = useState<Seat | null>(null);
    const [newSeatName, setNewSeatName] = useState('');
    const [resizeHandle, setResizeHandle] = useState<string>('');
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 }); // Track where drag started
    const [hasDragged, setHasDragged] = useState(false); // Track if actual dragging occurred
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [hoveredSection, setHoveredSection] = useState<number | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    const [newFloor, setNewFloor] = useState({ name: '', floor_number: '', description: '' });
    const [newSection, setNewSection] = useState({
        name: '',
        department: '',
        color: '#6366F1',
        rows: 2,
        seatsPerRow: 4,
    });

    useEffect(() => {
        fetchFloors();
        fetchDepartments();
    }, []);

    const fetchFloors = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('app/office-floors/');

            // Validate and fix section dimensions
            const validatedData = response.data.map((floor: Floor) => ({
                ...floor,
                sections: floor.sections.map((section: Section) => {
                    // Ensure sections always have valid dimensions
                    const validWidth = section.width && section.width > 0 ? section.width : 200;
                    const validHeight = section.height && section.height > 0 ? section.height : 150;
                    const validRotation = section.rotation !== undefined ? section.rotation : 0;

                    // If dimensions were invalid, update backend
                    if (section.width !== validWidth || section.height !== validHeight || section.rotation !== validRotation) {
                        axiosInstance.patch(`app/office-sections/${section.id}/`, {
                            width: validWidth,
                            height: validHeight,
                            rotation: validRotation,
                        }).catch(err => console.error('Error fixing section dimensions:', err));
                    }

                    return {
                        ...section,
                        width: validWidth,
                        height: validHeight,
                        rotation: validRotation,
                    };
                }),
            }));

            setFloors(validatedData);

            // Update selected floor with fresh data if one is already selected
            if (selectedFloor) {
                const updatedFloor = validatedData.find((f: Floor) => f.id === selectedFloor.id);
                if (updatedFloor) {
                    setSelectedFloor(updatedFloor);
                }
            } else if (validatedData.length > 0) {
                // Select first floor if none selected
                setSelectedFloor(validatedData[0]);
            }
        } catch (error) {
            console.error('Error fetching floors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await axiosInstance.get('app/departments/');
            setDepartments(response.data);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const handleCreateFloor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axiosInstance.post('app/office-floors/', newFloor);
            setShowFloorModal(false);
            setNewFloor({ name: '', floor_number: '', description: '' });
            fetchFloors();
        } catch (error) {
            console.error('Error creating floor:', error);
        }
    };

    const handleCreateSection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFloor) return;
        try {
            const sectionData = {
                ...newSection,
                floor: selectedFloor.id,
                position_x: 300,
                position_y: 200,
                width: newSection.seatsPerRow * 80 + 40,
                height: newSection.rows * 100 + 70,
                rotation: 0, // Explicitly set rotation to 0 for new sections
            };

            const sectionResponse = await axiosInstance.post('app/office-sections/', sectionData);
            const createdSection = sectionResponse.data;

            const seatPromises = [];
            for (let row = 0; row < newSection.rows; row++) {
                for (let col = 0; col < newSection.seatsPerRow; col++) {
                    const seatNumber = `${String.fromCharCode(65 + row)}${col + 1}`;
                    seatPromises.push(
                        axiosInstance.post('app/office-seats/', {
                            section: createdSection.id,
                            seat_number: seatNumber,
                            position_x: col * 80 + 20,
                            position_y: row * 100 + 60,
                            is_available: true,
                        })
                    );
                }
            }

            await Promise.all(seatPromises);

            setShowSectionModal(false);
            setNewSection({ name: '', department: '', color: '#6366F1', rows: 2, seatsPerRow: 4 });
            fetchFloors();
        } catch (error) {
            console.error('Error creating section:', error);
        }
    };

    const handleDeleteFloor = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this floor?')) {
            try {
                await axiosInstance.delete(`app/office-floors/${id}/`);
                fetchFloors();
            } catch (error) {
                console.error('Error deleting floor:', error);
            }
        }
    };

    const handleAddDeskToSection = (section: Section, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedSectionForDesk(section);
        setShowAddDeskModal(true);
        // Generate next desk number
        const existingNumbers = section.seats.map(s => s.seat_number);
        const lastNumber = existingNumbers.length > 0 ? existingNumbers.length + 1 : 1;
        setNewDeskName(`D${lastNumber}`);
    };

    const handleCreateDesk = async () => {
        if (!selectedSectionForDesk || !newDeskName.trim()) return;

        try {
            // Find a good position for the new desk (center of section or next available spot)
            const sectionWidth = selectedSectionForDesk.width;
            const sectionHeight = selectedSectionForDesk.height;
            const existingSeats = selectedSectionForDesk.seats.length;

            // Calculate position in a grid-like fashion
            const col = existingSeats % 4; // 4 desks per row
            const row = Math.floor(existingSeats / 4);

            await axiosInstance.post('app/office-seats/', {
                section: selectedSectionForDesk.id,
                seat_number: newDeskName.trim(),
                position_x: col * 80 + 20,
                position_y: row * 100 + 60,
                is_available: true,
            });

            setShowAddDeskModal(false);
            setSelectedSectionForDesk(null);
            setNewDeskName('');
            fetchFloors();
        } catch (error) {
            console.error('Error creating desk:', error);
        }
    };

    const handleAddFloorDoor = async () => {
        if (!selectedFloor) return;

        try {
            // Fetch latest floor data to ensure we have up-to-date sections
            const allFloorsData = await axiosInstance.get('app/office-floors/');
            const currentFloorData = allFloorsData.data.find((f: Floor) => f.id === selectedFloor.id) || selectedFloor;

            // Find or create the hidden "Floor Assets" section
            // We use a specific name to identify it later for special rendering
            let assetsSection = currentFloorData.sections?.find((s: Section) => s.name === '_FLOOR_ASSETS_');

            if (!assetsSection) {
                // Create the hidden section if it doesn't exist
                const sectionResponse = await axiosInstance.post('app/office-sections/', {
                    floor: selectedFloor.id,
                    name: '_FLOOR_ASSETS_',
                    position_x: 0,
                    position_y: 0,
                    width: 0, // Zero size so it doesn't interfere with anything
                    height: 0,
                    color: '#000000',
                });
                assetsSection = sectionResponse.data;
            }

            // Generate unique ID using timestamp to avoid collisions
            // Model has max_length=20 for seat_number
            // "D-" + last 8 digits of timestamp = 10 chars (Safe)
            const uniqueId = Date.now().toString().slice(-8);

            // Place door at center of viewport/canvas (approximate)
            // Since the section is at 0,0, these coordinates are effectively absolute
            const doorX = 400;
            const doorY = 300;

            await axiosInstance.post('app/office-seats/', {
                section: assetsSection.id,
                seat_number: `D-${uniqueId}`,
                position_x: doorX,
                position_y: doorY,
                rotation: 0,
                is_available: false,
            });

            fetchFloors();
            alert('Door added successfully!');
        } catch (error: any) {
            console.error('Error creating floor door:', error);
            alert(`Error adding door: ${error.response?.data?.seat_number?.[0] || 'Unknown error'}`);
        }
    };

    const handleDeleteSection = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this section?')) {
            try {
                await axiosInstance.delete(`app/office-sections/${id}/`);
                fetchFloors();
            } catch (error) {
                console.error('Error deleting section:', error);
            }
        }
    };

    const handleRotateSection = async (section: Section, e: React.MouseEvent) => {
        e.stopPropagation();
        const currentRotation = section.rotation || 0;
        const newRotation = (currentRotation + 90) % 360;

        // Update UI immediately
        setSelectedFloor(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                sections: prev.sections.map(s =>
                    s.id === section.id ? { ...s, rotation: newRotation } : s
                ),
            };
        });

        // Persist to backend
        try {
            await axiosInstance.patch(`app/office-sections/${section.id}/`, {
                rotation: newRotation,
            });
        } catch (error) {
            console.error('Error updating section rotation:', error);
            fetchFloors(); // Revert on error
        }
    };

    const handleMouseDown = (section: Section, e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('delete-btn')) return;
        if (target.classList.contains('resize-handle')) return;
        if (target.classList.contains('rotate-btn')) return;

        setDraggingSection(section);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            setDragOffset({
                x: e.clientX - rect.left - section.position_x,
                y: e.clientY - rect.top - section.position_y,
            });
        }
    };

    const handleSeatMouseDown = (seat: Seat, section: Section, e: React.MouseEvent) => {
        e.stopPropagation();
        setDraggingSeat(seat);
        setHasDragged(false); // Reset drag flag
        setDragStartPos({ x: e.clientX, y: e.clientY }); // Track starting position
        setDragOffset({
            x: e.clientX - seat.position_x,
            y: e.clientY - seat.position_y,
        });
    };

    const handleRotateSeat = async (seat: Seat, e: React.MouseEvent) => {
        e.stopPropagation();
        const currentRotation = seat.rotation || 0;
        const newRotation = (currentRotation + 90) % 360;

        // Update UI immediately
        setSelectedFloor(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                sections: prev.sections.map(section => ({
                    ...section,
                    seats: section.seats.map(s =>
                        s.id === seat.id ? { ...s, rotation: newRotation } : s
                    ),
                })),
            };
        });

        // Persist to backend
        try {
            await axiosInstance.patch(`app/office-seats/${seat.id}/`, {
                rotation: newRotation,
            });
        } catch (error) {
            console.error('Error updating seat rotation:', error);
            fetchFloors(); // Revert on error
        }
    };

    const handleSeatNameUpdate = async () => {
        if (!editingSeat || !newSeatName.trim()) return;

        try {
            await axiosInstance.patch(`app/office-seats/${editingSeat.id}/`, {
                seat_number: newSeatName.trim()
            });
            setEditingSeat(null);
            setNewSeatName('');
            fetchFloors();
        } catch (error) {
            console.error('Error updating seat name:', error);
        }
    };

    const handleResizeStart = (section: Section, handle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setResizingSection(section);
        setResizeHandle(handle);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            setResizeStart({
                x: e.clientX,
                y: e.clientY,
                width: section.width,
                height: section.height,
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingSection && !resizingSection && !draggingSeat && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, rect.width - draggingSection.width));
            const y = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, rect.height - draggingSection.height));

            setSelectedFloor(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    sections: prev.sections.map(s =>
                        s.id === draggingSection.id ? { ...s, position_x: x, position_y: y } : s
                    ),
                };
            });
        } else if (resizingSection && canvasRef.current) {
            const deltaX = e.clientX - resizeStart.x;
            const deltaY = e.clientY - resizeStart.y;

            let newWidth = resizeStart.width;
            let newHeight = resizeStart.height;

            if (resizeHandle.includes('e')) {
                newWidth = Math.max(200, resizeStart.width + deltaX);
            }
            if (resizeHandle.includes('s')) {
                newHeight = Math.max(150, resizeStart.height + deltaY);
            }
            if (resizeHandle.includes('w')) {
                newWidth = Math.max(200, resizeStart.width - deltaX);
            }
            if (resizeHandle.includes('n')) {
                newHeight = Math.max(150, resizeStart.height - deltaY);
            }

            setSelectedFloor(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    sections: prev.sections.map(s =>
                        s.id === resizingSection.id ? { ...s, width: newWidth, height: newHeight } : s
                    ),
                };
            });
        } else if (draggingSeat && selectedFloor) {
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;

            // Check if actual dragging occurred (movement > 5 pixels)
            const distanceMoved = Math.sqrt(
                Math.pow(e.clientX - dragStartPos.x, 2) +
                Math.pow(e.clientY - dragStartPos.y, 2)
            );
            if (distanceMoved > 5) {
                setHasDragged(true);
            }

            setSelectedFloor(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    sections: prev.sections.map(section => ({
                        ...section,
                        seats: section.seats.map(seat =>
                            seat.id === draggingSeat.id ? { ...seat, position_x: x, position_y: y } : seat
                        ),
                    })),
                };
            });
        }
    };

    const handleMouseUp = async () => {
        if (draggingSection) {
            try {
                // Get the actual updated position from selectedFloor state
                const updatedSection = selectedFloor?.sections.find(s => s.id === draggingSection.id);
                if (updatedSection) {
                    await axiosInstance.patch(`app/office-sections/${draggingSection.id}/`, {
                        position_x: updatedSection.position_x,
                        position_y: updatedSection.position_y,
                    });
                }
            } catch (error) {
                console.error('Error updating section position:', error);
            }
            setDraggingSection(null);
        }

        if (resizingSection) {
            try {
                // Get the actual updated dimensions from selectedFloor state
                const updatedSection = selectedFloor?.sections.find(s => s.id === resizingSection.id);
                if (updatedSection) {
                    await axiosInstance.patch(`app/office-sections/${resizingSection.id}/`, {
                        width: updatedSection.width,
                        height: updatedSection.height,
                    });
                }
            } catch (error) {
                console.error('Error updating section size:', error);
            }
            setResizingSection(null);
            setResizeHandle('');
        }

        if (draggingSeat) {
            try {
                // Get the actual updated position from selectedFloor state
                let updatedSeat: Seat | undefined;
                for (const section of (selectedFloor?.sections || [])) {
                    updatedSeat = section.seats.find(seat => seat.id === draggingSeat.id);
                    if (updatedSeat) break;
                }

                // If dragging actually occurred, save the new position
                if (hasDragged && updatedSeat) {
                    await axiosInstance.patch(`app/office-seats/${draggingSeat.id}/`, {
                        position_x: updatedSeat.position_x,
                        position_y: updatedSeat.position_y,
                    });
                }
                // If no dragging occurred, handle click action
                else if (!hasDragged) {
                    // If it's a door (section or floor level), delete it
                    if (draggingSeat.seat_number.startsWith('DOOR-') || draggingSeat.seat_number.startsWith('FLOOR-DOOR-') || draggingSeat.seat_number.startsWith('D-')) {
                        if (window.confirm('Remove this door?')) {
                            try {
                                await axiosInstance.delete(`app/office-seats/${draggingSeat.id}/`);
                                fetchFloors();
                            } catch (error) {
                                console.error('Error deleting door:', error);
                            }
                        }
                    }
                    // If it's a desk, open rename modal
                    else {
                        setEditingSeat(draggingSeat);
                        setNewSeatName(draggingSeat.seat_number);
                    }
                }
            } catch (error) {
                console.error('Error updating seat position:', error);
            }
            setDraggingSeat(null);
            setHasDragged(false);
        }
    };

    const ChairIcon = ({ color, occupied }: { color: string; occupied: boolean }) => (
        <svg width="60" height="70" viewBox="0 0 60 70" fill="none" className="drop-shadow-lg">
            {/* Desk */}
            <rect x="5" y="18" width="50" height="35" rx="4"
                fill={occupied ? color : '#F3F4F6'}
                stroke={color}
                strokeWidth="2.5"
                className="transition-all duration-300"
            />

            {/* Desk shine */}
            <rect x="8" y="21" width="20" height="8" rx="2"
                fill="white"
                opacity="0.3"
            />

            {/* Chair seat */}
            <rect x="12" y="56" width="36" height="10" rx="3"
                fill={occupied ? color : '#D1D5DB'}
                opacity="0.9"
                className="transition-all duration-300"
            />

            {/* Chair back */}
            <rect x="14" y="48" width="32" height="10" rx="3"
                fill={occupied ? color : '#D1D5DB'}
                opacity="0.7"
                className="transition-all duration-300"
            />

            {/* Person icon if occupied */}
            {occupied && (
                <g opacity="0.95">
                    {/* Head */}
                    <circle cx="30" cy="30" r="6" fill="white" />
                    {/* Body */}
                    <path d="M 30 36 L 30 42 M 24 39 L 36 39" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </g>
            )}
        </svg>
    );

    const DoorIcon = ({ color }: { color: string }) => (
        <svg width="60" height="80" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
            {/* Door frame */}
            <rect x="10" y="5" width="40" height="70" rx="2"
                fill={color}
                opacity="0.9"
                stroke="#333"
                strokeWidth="2"
            />

            {/* Door panel detail */}
            <rect x="15" y="10" width="30" height="30" rx="1"
                fill="white"
                opacity="0.2"
            />
            <rect x="15" y="45" width="30" height="20" rx="1"
                fill="white"
                opacity="0.2"
            />

            {/* Door handle */}
            <circle cx="42" cy="40" r="3"
                fill="#FFD700"
                stroke="#333"
                strokeWidth="1"
            />

            {/* Door sign (optional) */}
            <text x="30" y="22" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">🚪</text>
        </svg>
    );

    const renderDesk = (seat: Seat, sectionColor: string) => {
        const isOccupied = seat.employee !== null;
        const rotation = seat.rotation || 0;
        return (
            <div
                key={seat.id}
                className="absolute flex flex-col items-center group transition-all duration-200 hover:z-20"
                style={{
                    left: seat.position_x,
                    top: seat.position_y,
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                }}
            >
                <div className="relative">
                    {/* Label */}
                    <div
                        className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm bg-white/90 backdrop-blur-sm border border-gray-200 group-hover:shadow-md transition-all whitespace-nowrap"
                        style={{ color: sectionColor }}
                    >
                        {(seat.seat_number.startsWith('DOOR-') || seat.seat_number.startsWith('FLOOR-DOOR-') || seat.seat_number.startsWith('D-')) ? '🚪 Door' : seat.seat_number}
                    </div>

                    {/* Icon - Door or Chair based on seat type */}
                    <div
                        className="cursor-move"
                        onMouseDown={(e) => handleSeatMouseDown(seat, selectedFloor!.sections.find(s => s.seats.some(st => st.id === seat.id))!, e)}
                        title={(seat.seat_number.startsWith('DOOR-') || seat.seat_number.startsWith('FLOOR-DOOR-') || seat.seat_number.startsWith('D-')) ? 'Door - Click to remove' : (seat.employee_details?.name || `Click to rename - ${seat.seat_number}`)}
                    >
                        {(seat.seat_number.startsWith('DOOR-') || seat.seat_number.startsWith('FLOOR-DOOR-') || seat.seat_number.startsWith('D-')) ? (
                            <DoorIcon color={sectionColor} />
                        ) : (
                            <ChairIcon color={sectionColor} occupied={isOccupied} />
                        )}
                    </div>

                    {/* Rotate Button - Only show for desks, not doors */}
                    {!seat.seat_number.startsWith('DOOR-') && !seat.seat_number.startsWith('FLOOR-DOOR-') && !seat.seat_number.startsWith('D-') && (
                        <button
                            className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-6 h-6 bg-white/90 hover:bg-blue-500 hover:text-white backdrop-blur-sm rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold border border-gray-200"
                            onClick={(e) => handleRotateSeat(seat, e)}
                            title="Rotate desk direction"
                            style={{ color: sectionColor }}
                        >
                            ↻
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const ResizeHandles = ({ section, color }: { section: Section; color: string }) => (
        <>
            {['nw', 'ne', 'sw', 'se'].map(pos => (
                <div
                    key={pos}
                    className={`resize-handle absolute w-4 h-4 rounded-full border-2 shadow-lg z-20 transition-all hover:scale-125
                        ${pos === 'nw' ? '-top-2 -left-2 cursor-nw-resize' : ''}
                        ${pos === 'ne' ? '-top-2 -right-2 cursor-ne-resize' : ''}
                        ${pos === 'sw' ? '-bottom-2 -left-2 cursor-sw-resize' : ''}
                        ${pos === 'se' ? '-bottom-2 -right-2 cursor-se-resize' : ''}
                    `}
                    style={{ backgroundColor: color, borderColor: 'white' }}
                    onMouseDown={(e) => handleResizeStart(section, pos, e)}
                />
            ))}
            {['n', 's', 'w', 'e'].map(pos => (
                <div
                    key={pos}
                    className={`resize-handle absolute rounded-full border shadow-md z-20 transition-all hover:scale-110
                        ${pos === 'n' ? '-top-1 left-1/2 -translate-x-1/2 w-12 h-2 cursor-n-resize' : ''}
                        ${pos === 's' ? '-bottom-1 left-1/2 -translate-x-1/2 w-12 h-2 cursor-s-resize' : ''}
                        ${pos === 'w' ? 'top-1/2 -translate-y-1/2 -left-1 w-2 h-12 cursor-w-resize' : ''}
                        ${pos === 'e' ? 'top-1/2 -translate-y-1/2 -right-1 w-2 h-12 cursor-e-resize' : ''}
                    `}
                    style={{ backgroundColor: color, borderColor: 'white', opacity: 0.8 }}
                    onMouseDown={(e) => handleResizeStart(section, pos, e)}
                />
            ))}
        </>
    );

    return (
        <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 flex flex-col">
            <div className="p-4">
                <PageBreadCrumb pageTitle="Office Structure Designer" />
            </div>

            <div className="flex-1 flex gap-4 px-4 pb-4 overflow-hidden">
                {/* Premium Sidebar */}
                <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-hidden">
                    {/* Floors Card */}
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4 flex flex-col max-h-64">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                                    <span className="text-white text-lg">🏢</span>
                                </div>
                                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Floors</h3>
                            </div>
                            <button
                                onClick={() => setShowFloorModal(true)}
                                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium text-xs flex items-center gap-1"
                            >
                                <span className="text-base">+</span> Add
                            </button>
                        </div>
                        <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1">
                            {floors.map((floor) => (
                                <div
                                    key={floor.id}
                                    className={`p-3 rounded-xl cursor-pointer transition-all duration-300 ${selectedFloor?.id === floor.id
                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                        : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm hover:shadow-md'
                                        }`}
                                    onClick={() => setSelectedFloor(floor)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${selectedFloor?.id === floor.id ? 'bg-white/20' : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                {floor.floor_number}
                                            </div>
                                            <div>
                                                <p className={`font-semibold text-sm ${selectedFloor?.id === floor.id ? 'text-white' : 'dark:text-white'}`}>
                                                    {floor.name}
                                                </p>
                                                <p className={`text-xs ${selectedFloor?.id === floor.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    {floor.sections?.length || 0} sections
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFloor(floor.id);
                                            }}
                                            className={`text-2xl transition-all hover:scale-125 ${selectedFloor?.id === floor.id ? 'text-white hover:text-red-200' : 'text-red-500 hover:text-red-700'
                                                }`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Teams Legend Card */}
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4 flex flex-col max-h-48">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">👥</span>
                            <h4 className="text-sm font-bold dark:text-white">Teams</h4>
                        </div>
                        <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1">
                            {departments.map((dept, index) => {
                                const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
                                const color = colors[index % colors.length];
                                return (
                                    <div key={dept.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                                        <div className="w-4 h-4 rounded shadow-sm" style={{ backgroundColor: color }}></div>
                                        <span className="dark:text-gray-200 text-sm">{dept.department_name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Tips Card */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-xl rounded-2xl shadow-xl border border-amber-200/50 p-3 flex-shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">💡</span>
                            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Quick Tips</h4>
                        </div>
                        <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
                            <li className="flex items-start gap-1">
                                <span>🖱️</span>
                                <span>Drag sections to move</span>
                            </li>
                            <li className="flex items-start gap-1">
                                <span>↔️</span>
                                <span>Use handles to resize</span>
                            </li>
                            <li className="flex items-start gap-1">
                                <span>🪑</span>
                                <span>Click desks to rename</span>
                            </li>
                            <li className="flex items-start gap-1">
                                <span>🔄</span>
                                <span>Rotate with ↻ button</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Premium Canvas Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedFloor ? (
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 flex flex-col h-full overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex-shrink-0">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">{selectedFloor.name}</h2>
                                        <p className="text-blue-100 text-sm">{selectedFloor.description || 'Design your office layout'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowSectionModal(true)}
                                            className="px-4 py-2 bg-white text-blue-600 rounded-xl hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 font-semibold flex items-center gap-2 text-sm"
                                        >
                                            <span className="text-lg">+</span> Add Section
                                        </button>
                                        <button
                                            onClick={handleAddFloorDoor}
                                            className="px-4 py-2 bg-white text-orange-600 rounded-xl hover:bg-orange-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 font-semibold flex items-center gap-2 text-sm"
                                        >
                                            <span className="text-lg">🚪</span> Add Door
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Premium Drawing Canvas */}
                            <div
                                ref={canvasRef}
                                className="relative bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-slate-900/50 dark:to-gray-900/50 flex-1 overflow-auto"
                                style={{
                                    backgroundImage: `
                                        radial-gradient(circle at 2px 2px, rgba(99, 102, 241, 0.1) 1px, transparent 0),
                                        radial-gradient(circle at 2px 2px, rgba(139, 92, 246, 0.05) 1px, transparent 0)
                                    `,
                                    backgroundSize: '40px 40px, 20px 20px',
                                    backgroundPosition: '0 0, 20px 20px',
                                    cursor: draggingSection ? 'grabbing' : draggingSeat ? 'grabbing' : resizingSection ? 'nwse-resize' : 'default'
                                }}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                {selectedFloor.sections?.map((section) => {
                                    // Special rendering for hidden floor assets section
                                    if (section.name === '_FLOOR_ASSETS_') {
                                        return (
                                            <div
                                                key={section.id}
                                                className="absolute pointer-events-none"
                                                style={{ left: 0, top: 0, width: '100%', height: '100%' }}
                                            >
                                                {section.seats?.map((seat) => (
                                                    <div key={seat.id} className="pointer-events-auto">
                                                        {renderDesk(seat, '#FB923C')}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={section.id}
                                            className={`absolute rounded-2xl shadow-2xl border-2 transition-all duration-300 ${hoveredSection === section.id ? 'shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : ''
                                                }`}
                                            style={{
                                                left: section.position_x,
                                                top: section.position_y,
                                                width: section.width,
                                                height: section.height,
                                                background: `linear-gradient(135deg, ${section.color}15, ${section.color}25)`,
                                                borderColor: section.color,
                                                cursor: 'move',
                                                transform: `rotate(${section.rotation || 0}deg)`,
                                                backdropFilter: 'blur(10px)',
                                            }}
                                            onMouseDown={(e) => handleMouseDown(section, e)}
                                            onMouseEnter={() => setHoveredSection(section.id)}
                                            onMouseLeave={() => setHoveredSection(null)}
                                        >
                                            {/* Premium Section Header */}
                                            <div
                                                className="px-4 py-3 rounded-t-2xl flex justify-between items-center cursor-move backdrop-blur-sm"
                                                style={{
                                                    background: `linear-gradient(135deg, ${section.color}, ${section.color}dd)`,
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                                                        {section.seats?.length || 0}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-base">{section.name}</p>
                                                        <p className="text-white/90 text-xs">{section.department_name || 'No Team'}</p>
                                                    </div>
                                                </div>
                                                {/* Action buttons - Only show on hover */}
                                                {hoveredSection === section.id && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="add-desk-btn w-9 h-9 bg-white/20 hover:bg-green-500 backdrop-blur-sm rounded-lg transition-all flex items-center justify-center text-white text-sm font-bold shadow-lg hover:scale-110"
                                                            onClick={(e) => handleAddDeskToSection(section, e)}
                                                            title="Add Desk"
                                                        >
                                                            +🪑
                                                        </button>
                                                        <button
                                                            className="rotate-btn w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all flex items-center justify-center text-white text-xl font-bold shadow-lg hover:scale-110"
                                                            onClick={(e) => handleRotateSection(section, e)}
                                                            title="Rotate 90°"
                                                        >
                                                            ↻
                                                        </button>
                                                        <button
                                                            className="delete-btn w-9 h-9 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm rounded-lg transition-all flex items-center justify-center text-white text-xl font-bold shadow-lg hover:scale-110"
                                                            onClick={(e) => handleDeleteSection(section.id, e)}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Seats Grid */}
                                            <div className="relative p-4 overflow-hidden" style={{ height: section.height - 60 }}>
                                                {section.seats?.map((seat) => renderDesk(seat, section.color))}
                                            </div>

                                            {/* Resize Handles - Only show on hover */}
                                            {!draggingSection && hoveredSection === section.id && <ResizeHandles section={section} color={section.color} />}
                                        </div>
                                    );
                                })}

                                {selectedFloor.sections?.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center p-8 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl">
                                            <div className="text-6xl mb-4">🏢</div>
                                            <p className="text-gray-600 dark:text-gray-300 text-xl font-semibold mb-2">Start Designing Your Office</p>
                                            <p className="text-gray-500 dark:text-gray-400">Click "Add Section" to create your first desk area</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-16 text-center border border-white/20">
                            <div className="text-8xl mb-6">🏢</div>
                            <p className="text-gray-500 dark:text-gray-400 text-xl">
                                Select a floor from the sidebar or create a new one to get started
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Rename Seat Modal */}
            {
                editingSeat && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md transform transition-all scale-100 animate-in fade-in">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-3xl">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span>✏️</span> Rename Seat
                                </h3>
                            </div>
                            <div className="p-6">
                                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Seat Name</label>
                                <input
                                    type="text"
                                    value={newSeatName}
                                    onChange={(e) => setNewSeatName(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                    placeholder="e.g., A1, Manager Desk, Dev-01"
                                    autoFocus
                                    onKeyPress={(e) => e.key === 'Enter' && handleSeatNameUpdate()}
                                />
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        setEditingSeat(null);
                                        setNewSeatName('');
                                    }}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSeatNameUpdate}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all font-semibold"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Premium Add Desk Modal */}
            {
                showAddDeskModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md transform transition-all scale-100 animate-in fade-in">
                            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-3xl">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span>🪑</span> Add New Desk
                                </h3>
                            </div>
                            <div className="p-6">
                                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Desk Name</label>
                                <input
                                    type="text"
                                    value={newDeskName}
                                    onChange={(e) => setNewDeskName(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                                    placeholder="e.g., D1, Desk-01"
                                    autoFocus
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreateDesk()}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Section: {selectedSectionForDesk?.name}
                                </p>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowAddDeskModal(false);
                                        setSelectedSectionForDesk(null);
                                        setNewDeskName('');
                                    }}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateDesk}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all font-semibold"
                                >
                                    Add Desk
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Premium Add Floor Modal */}
            {
                showFloorModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-3xl">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span>🏢</span> Add New Floor
                                </h3>
                            </div>
                            <form onSubmit={handleCreateFloor} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Floor Name</label>
                                    <input
                                        type="text"
                                        value={newFloor.name}
                                        onChange={(e) => setNewFloor({ ...newFloor, name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                        required
                                        placeholder="e.g., Ground Floor, First Floor"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Floor Number</label>
                                    <input
                                        type="number"
                                        value={newFloor.floor_number}
                                        onChange={(e) => setNewFloor({ ...newFloor, floor_number: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Description</label>
                                    <textarea
                                        value={newFloor.description}
                                        onChange={(e) => setNewFloor({ ...newFloor, description: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                                        rows={3}
                                        placeholder="Optional description..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowFloorModal(false)}
                                        className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 font-semibold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all font-semibold"
                                    >
                                        Create Floor
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Premium Add Section Modal */}
            {
                showSectionModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg">
                            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-3xl">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span>📋</span> Add Desk Section
                                </h3>
                            </div>
                            <form onSubmit={handleCreateSection} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Section Name</label>
                                    <input
                                        type="text"
                                        value={newSection.name}
                                        onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                                        required
                                        placeholder="e.g., Engineering Zone, Sales Area"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Team/Department</label>
                                    <select
                                        value={newSection.department}
                                        onChange={(e) => setNewSection({ ...newSection, department: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.department_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Rows</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={newSection.rows}
                                            onChange={(e) => setNewSection({ ...newSection, rows: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Seats per Row</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={newSection.seatsPerRow}
                                            onChange={(e) => setNewSection({ ...newSection, seatsPerRow: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Team Color</label>
                                    <input
                                        type="color"
                                        value={newSection.color}
                                        onChange={(e) => setNewSection({ ...newSection, color: e.target.value })}
                                        className="w-full h-14 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowSectionModal(false)}
                                        className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 font-semibold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all font-semibold"
                                    >
                                        Create Section
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #6366F1, #8B5CF6);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #4F46E5, #7C3AED);
                }
            `}</style>
        </div >
    );
};

export default OfficeStructure;
