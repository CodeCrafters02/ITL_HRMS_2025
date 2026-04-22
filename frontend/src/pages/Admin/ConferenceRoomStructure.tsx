import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer, Arc } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconSave from '../../components/Icon/IconSave';
import IconTrash from '../../components/Icon/IconTrash';
import IconLayout from '../../components/Icon/IconLayout';
import IconHome from '../../components/Icon/IconHome';
import IconMenuComponents from '../../components/Icon/Menu/IconMenuComponents';
import Swal from 'sweetalert2';

interface LayoutElement {
    id: string;
    type: 'seat' | 'door' | 'zone' | 'room' | 'label';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    name: string;
    color: string;
    capacity?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const ConferenceRoomStructure = () => {
    const dispatch = useDispatch();
    const isDarkMode = useSelector((state: any) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const [locations, setLocations] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [floors, setFloors] = useState<any[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<any>(null);
    const [elements, setElements] = useState<LayoutElement[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    const stageRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);

    useEffect(() => {
        dispatch(setPageTitle('Conference Room Structure'));
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/office-locations/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const locList = Array.isArray(data) ? data : (data.results || []);
                setLocations(locList);
                if (locList.length > 0 && !selectedLocation) handleLocationSelect(locList[0]);
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    const handleAddLocation = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Add New Office Location',
            html:
                '<input id="swal-loc-name" class="swal2-input" placeholder="Office Name (e.g. NYC Branch)">' +
                '<textarea id="swal-loc-addr" class="swal2-textarea" placeholder="Address"></textarea>',
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                return {
                    name: (document.getElementById('swal-loc-name') as HTMLInputElement).value,
                    address: (document.getElementById('swal-loc-addr') as HTMLTextAreaElement).value
                };
            }
        });

        if (formValues && formValues.name) {
            try {
                const token = localStorage.getItem('access_token');
                const res = await fetch(`${API_BASE_URL}/app/office-locations/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formValues)
                });
                if (res.ok) {
                    const newLoc = await res.json();
                    setLocations([...locations, newLoc]);
                    handleLocationSelect(newLoc);
                    Swal.fire('Success', 'Office location added!', 'success');
                } else {
                    Swal.fire('Error', 'Failed to add location', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'An unexpected error occurred', 'error');
            }
        }
    };

    const handleAddFloor = async () => {
        if (!selectedLocation) {
            Swal.fire('Warning', 'Please select or add an office location first.', 'warning');
            return;
        }

        const { value: floorName } = await Swal.fire({
            title: 'Add New Floor',
            input: 'text',
            inputLabel: 'Floor Name (e.g., Level 1)',
            inputPlaceholder: 'Enter floor name...',
            showCancelButton: true
        });

        if (floorName) {
            try {
                const token = localStorage.getItem('access_token');
                const res = await fetch(`${API_BASE_URL}/app/office-floors/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: floorName,
                        floor_number: floors.length > 0 ? Math.max(...floors.map(f => f.floor_number)) + 1 : 1,
                        location: selectedLocation.id
                    })
                });
                if (res.ok) {
                    const newFloor = await res.json();
                    setFloors([...floors, newFloor]);
                    handleFloorSelect(newFloor);
                    Swal.fire('Success', 'Floor added!', 'success');
                } else {
                    const err = await res.json();
                    Swal.fire('Error', err.detail || 'Failed to add floor', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'An unexpected error occurred', 'error');
            }
        }
    };

    const handleLocationSelect = (location: any) => {
        setSelectedLocation(location);
        setSelectedFloor(null);
        setElements([]);
        fetchFloors(location.id);
    };

    const fetchFloors = async (locationId: number) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/office-floors/?location=${locationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const floorList = Array.isArray(data) ? data : (data.results || []);
                setFloors(floorList);
                if (floorList.length > 0) handleFloorSelect(floorList[0]);
            }
        } catch (error) {
            console.error('Error fetching floors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFloorSelect = (floor: any) => {
        setSelectedFloor(floor);
        if (floor.layout_data && floor.layout_data.elements) {
            setElements(floor.layout_data.elements);
        } else {
            setElements([]);
        }
    };

    const stageSize = useMemo(() => {
        if (!elements || elements.length === 0) return { width: 2000, height: 1500 };
        const maxX = Math.max(...elements.map(el => (el.x || 0) + (el.width || 0)));
        const maxY = Math.max(...elements.map(el => (el.y || 0) + (el.height || 0)));
        return {
            width: Math.max(2000, maxX + 500),
            height: Math.max(1500, maxY + 500)
        };
    }, [elements]);

    const addRoom = () => {
        const newElement: LayoutElement = {
            id: `room-${Date.now()}`,
            type: 'room',
            x: 100,
            y: 100,
            width: 250,
            height: 180,
            rotation: 0,
            name: `Conf Room ${elements.filter(e => e.type === 'room').length + 1}`,
            color: '#6B7280',
            capacity: 10
        };
        setElements([...elements, newElement]);
        setSelectedId(newElement.id);
    };

    const deleteElement = () => {
        if (!selectedId) return;
        setElements(elements.filter(e => e.id !== selectedId));
        setSelectedId(null);
    };

    const updateElement = (id: string, attrs: Partial<LayoutElement>) => {
        setElements(elements.map(e => e.id === id ? { ...e, ...attrs } : e));
    };

    const handleSave = async () => {
        if (!selectedFloor) return;
        try {
            const token = localStorage.getItem('access_token');
            
            // 1. Save floor layout (elements)
            const floorRes = await fetch(`${API_BASE_URL}/app/office-floors/${selectedFloor.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ layout_data: { elements } })
            });

            if (!floorRes.ok) throw new Error('Failed to update floor layout');

            // 2. Sync ConferenceRoom models
            const roomElements = elements.filter(e => e.type === 'room');
            
            // First, get existing rooms for this floor to see what to update/delete
            const existingRoomsRes = await fetch(`${API_BASE_URL}/app/conference-rooms/?floor=${selectedFloor.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const existingRooms = await existingRoomsRes.json();

            // Logic: 
            // a) For each room element in layout, create or update ConferenceRoom
            for (const el of roomElements) {
                const existing = existingRooms.find((r: any) => r.layout_element_id === el.id);
                const method = existing ? 'PATCH' : 'POST';
                const url = existing ? `${API_BASE_URL}/app/conference-rooms/${existing.id}/` : `${API_BASE_URL}/app/conference-rooms/`;
                
                await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: el.name,
                        capacity: el.capacity || 0,
                        layout_element_id: el.id,
                        floor: selectedFloor.id
                    })
                });
            }

            // b) (Optional) Deactivate rooms that were removed from layout
            const layoutIds = roomElements.map(e => e.id);
            for (const r of existingRooms) {
                if (!layoutIds.includes(r.layout_element_id)) {
                    await fetch(`${API_BASE_URL}/app/conference-rooms/${r.id}/`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ is_active: false })
                    });
                }
            }

            Swal.fire({ title: 'Saved!', text: 'Structure updated and synced.', icon: 'success', timer: 2000, showConfirmButton: false });
        } catch (error) {
            Swal.fire('Error', 'Failed to save layout', 'error');
        }
    };

    const checkDeselect = (e: any) => {
        if (e.target === e.target.getStage()) setSelectedId(null);
    };

    useEffect(() => {
        if (selectedId) {
            const node = stageRef.current?.findOne('#' + selectedId);
            if (node) transformerRef.current?.nodes([node]);
        } else {
            transformerRef.current?.nodes([]);
        }
    }, [selectedId]);

    const selectedElement = elements.find(e => e.id === selectedId);

    return (
        <div className="flex flex-col h-[calc(100vh-90px)] space-y-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold mb-0.5">Conference Room Structure</h2>
                    <p className="text-white/80 text-sm font-medium">Define and place conference rooms on floor maps to enable employee bookings.</p>
                </div>
                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                    <IconHome className="w-48 h-48" />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 overflow-x-auto w-full sm:w-auto">
                    <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">Office</span>
                        <div className="flex items-center gap-2">
                            <select
                                className="form-select bg-gray-50 dark:bg-[#1b2e4b] border-gray-200 dark:border-gray-700 rounded-lg pr-10 font-bold text-sm min-w-[180px] cursor-pointer hover:border-primary transition-colors focus:ring-primary shadow-sm"
                                value={selectedLocation?.id || ''}
                                onChange={(e) => handleLocationSelect(locations.find(l => l.id === parseInt(e.target.value)))}
                            >
                                <option value="" disabled>Select Office...</option>
                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <button
                                onClick={handleAddLocation}
                                className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                                title="Add Office"
                            >
                                <IconPlus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pr-4">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">Floors</span>
                        <div className="flex items-center gap-2">
                            <select
                                className="form-select bg-gray-50 dark:bg-[#1b2e4b] border-gray-200 dark:border-gray-700 rounded-lg pr-10 font-bold text-sm min-w-[180px] cursor-pointer hover:border-primary transition-colors focus:ring-primary shadow-sm"
                                value={selectedFloor?.id || ''}
                                onChange={(e) => handleFloorSelect(floors.find(f => f.id === parseInt(e.target.value)))}
                                disabled={!selectedLocation}
                            >
                                <option value="" disabled>Select Floor...</option>
                                {floors.map(f => <option key={f.id} value={f.id}>{f.name} (F{f.floor_number})</option>)}
                            </select>
                            <button
                                onClick={handleAddFloor}
                                disabled={!selectedLocation}
                                className={`p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm ${!selectedLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Add New Floor"
                            >
                                <IconPlus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleSave} disabled={!selectedFloor} className="btn btn-primary gap-2 px-6">
                        <IconSave className="w-5 h-5" /> Save Layout
                    </button>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                <div className="w-64 flex flex-col gap-6">
                    <div className="panel bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm relative overflow-hidden">
                        {!selectedFloor && (
                            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 z-10 flex items-center justify-center text-center p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select a floor first</p>
                            </div>
                        )}
                        <h6 className="font-bold uppercase text-xs tracking-widest text-gray-400 mb-4">Add Components</h6>
                        <button onClick={addRoom} className="w-full flex flex-col items-center gap-2 p-6 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl hover:scale-105 transition-transform group">
                            <IconMenuComponents className="w-10 h-10 text-indigo-600 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold text-indigo-700">Add Conf. Room</span>
                        </button>
                    </div>

                    {selectedElement && (
                        <div className="panel bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm animate-fade-in-down">
                            <div className="flex items-center justify-between mb-4">
                                <h6 className="font-bold uppercase text-xs tracking-widest text-gray-400">Properties</h6>
                                <button onClick={deleteElement} className="text-danger hover:text-red-700"><IconTrash className="w-4 h-4" /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold mb-1 block text-gray-500">Room Name</label>
                                    <input type="text" value={selectedElement.name} onChange={(e) => updateElement(selectedId!, { name: e.target.value })} className="form-input text-sm font-bold" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block text-gray-500">Capacity (Pax)</label>
                                    <input type="number" value={selectedElement.capacity || 0} onChange={(e) => updateElement(selectedId!, { capacity: parseInt(e.target.value) })} className="form-input text-sm font-bold" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block text-gray-500">Color Overlay</label>
                                    <input type="color" value={selectedElement.color} onChange={(e) => updateElement(selectedId!, { color: e.target.value })} className="w-full h-10 rounded cursor-pointer border-none" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 bg-gray-100 dark:bg-black/20 rounded-2xl overflow-auto border border-gray-200 dark:border-gray-800 shadow-inner relative">
                    <Stage
                        width={stageSize.width}
                        height={stageSize.height}
                        onMouseDown={checkDeselect}
                        ref={stageRef}
                        className="bg-white dark:bg-[#1a2233]"
                        style={{ 
                            backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)', 
                            backgroundSize: '20px 20px',
                            minWidth: stageSize.width,
                            minHeight: stageSize.height
                        }}
                    >
                        <Layer>
                            {elements.map((el) => {
                                // Render existing background elements as semi-transparent
                                // Render ROOM elements as interactive
                                const isRoom = el.type === 'room';
                                const opacity = isRoom ? 1 : 0.3;
                                
                                return (
                                    <Group
                                        key={el.id}
                                        id={el.id}
                                        x={el.x}
                                        y={el.y}
                                        rotation={el.rotation}
                                        draggable={isRoom}
                                        dragBoundFunc={(pos) => ({
                                            x: Math.max(0, pos.x),
                                            y: Math.max(0, pos.y)
                                        })}
                                        onDragEnd={(e) => isRoom && updateElement(el.id, { x: e.target.x(), y: e.target.y() })}
                                        onClick={() => isRoom && setSelectedId(el.id)}
                                        opacity={opacity}
                                        onTransformEnd={(e) => {
                                            if (!isRoom) return;
                                            const node = e.target;
                                            const scaleX = node.scaleX();
                                            const scaleY = node.scaleY();
                                            node.scaleX(1);
                                            node.scaleY(1);
                                            updateElement(el.id, {
                                                x: node.x(),
                                                y: node.y(),
                                                width: Math.max(20, el.width * scaleX),
                                                height: Math.max(20, el.height * scaleY),
                                                rotation: node.rotation()
                                            });
                                        }}
                                    >
                                        <Rect
                                            width={el.width}
                                            height={el.height}
                                            fill={isRoom ? el.color + '44' : '#E5E7EB'}
                                            stroke={isRoom ? el.color : '#9CA3AF'}
                                            strokeWidth={isRoom ? 3 : 1}
                                            cornerRadius={isRoom ? 10 : 0}
                                        />
                                        <Text
                                            text={el.name}
                                            fontSize={isRoom ? 14 : 10}
                                            fontStyle="bold"
                                            fill={isRoom ? (isDarkMode ? '#fff' : '#000') : '#9CA3AF'}
                                            padding={10}
                                            width={el.width}
                                            align="center"
                                        />
                                        {isRoom && el.capacity && (
                                            <Text
                                                text={`Cap: ${el.capacity}`}
                                                fontSize={10}
                                                fill={isDarkMode ? '#ccc' : '#666'}
                                                y={el.height - 20}
                                                width={el.width}
                                                align="center"
                                            />
                                        )}
                                    </Group>
                                );
                            })}
                            <Transformer ref={transformerRef} rotateEnabled />
                        </Layer>
                    </Stage>
                </div>
            </div>
        </div>
    );
};

export default ConferenceRoomStructure;
