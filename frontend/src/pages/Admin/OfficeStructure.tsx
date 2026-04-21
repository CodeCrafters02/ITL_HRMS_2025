import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Transformer, Line, Arc } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconSave from '../../components/Icon/IconSave';
import IconTrash from '../../components/Icon/IconTrash';
import IconLayout from '../../components/Icon/IconLayout';
import IconUsers from '../../components/Icon/IconUsers';
import IconNotes from '../../components/Icon/IconNotes';
import { IRootState } from '../../store';
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
    department?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const OfficeStructure = () => {
    const dispatch = useDispatch();
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    
    // Locations state
    const [locations, setLocations] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [loadingLocations, setLoadingLocations] = useState(true);
    
    // Floors state
    const [floors, setFloors] = useState<any[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<any>(null);
    const [loadingFloors, setLoadingFloors] = useState(false);
    
    // Layout state
    const [elements, setElements] = useState<LayoutElement[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const stageRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);

    useEffect(() => {
        dispatch(setPageTitle('Office Structure'));
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        setLoadingLocations(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/office-locations/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const locList = Array.isArray(data) ? data : (data.results || []);
                setLocations(locList);
                if (locList.length > 0 && !selectedLocation) {
                    handleLocationSelect(locList[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        } finally {
            setLoadingLocations(false);
        }
    };

    const handleLocationSelect = (location: any) => {
        setSelectedLocation(location);
        setSelectedFloor(null); // Reset floor selection when switching offices
        setFloors([]);
        fetchFloors(location.id);
    };

    const fetchFloors = async (locationId?: number) => {
        const locId = locationId || selectedLocation?.id;
        if (!locId) return;
        
        setLoadingFloors(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/office-floors/?location=${locId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const floorList = Array.isArray(data) ? data : (data.results || []);
                setFloors(floorList);
                if (floorList.length > 0 && !selectedFloor) {
                    handleFloorSelect(floorList[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching floors:', error);
        } finally {
            setLoadingFloors(false);
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

    // --- Editor Actions ---
    const addElement = (type: 'seat' | 'door' | 'zone' | 'room' | 'label') => {
        const newElement: LayoutElement = {
            id: `${type}-${Date.now()}`,
            type,
            x: 50,
            y: 50,
            width: (type === 'zone' || type === 'room') ? 200 : (type === 'door' ? 60 : (type === 'label' ? 120 : 40)),
            height: (type === 'zone' || type === 'room') ? 150 : (type === 'door' ? 60 : (type === 'label' ? 40 : 40)),
            rotation: 0,
            name: type === 'seat' ? `S-${elements.filter(e => e.type === 'seat').length + 1}` : 
                  (type === 'zone' ? 'New Zone' : (type === 'room' ? 'Conf. Room' : (type === 'label' ? 'Label Text' : 'Door'))),
            color: type === 'zone' ? '#3B82F6' : (type === 'room' ? '#6B7280' : 
                   (type === 'seat' ? '#10B981' : (type === 'label' ? (isDark ? '#e0e6ed' : '#3b3f5c') : '#9CA3AF'))),
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

    const handleSave = async () => {
        if (!selectedFloor) return;
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/office-floors/${selectedFloor.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    layout_data: { elements }
                })
            });
            if (res.ok) {
                // Update local floors state so that switching back and forth works without refresh
                const updatedLayout = { elements };
                setFloors((prev: any[]) => prev.map(f => f.id === selectedFloor.id ? { ...f, layout_data: updatedLayout } : f));
                setSelectedFloor((prev: any) => prev ? { ...prev, layout_data: updatedLayout } : null);
                
                Swal.fire({ title: 'Saved!', text: 'Office layout updated successfully.', icon: 'success', timer: 2000, showConfirmButton: false });
            } else {
                const errData = await res.json();
                Swal.fire('Error', errData.detail || 'Failed to save layout. Please check your permissions.', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save layout', 'error');
        }
    };

    // --- Selection Logic ---
    const checkDeselect = (e: any) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
            setSelectedId(null);
        }
    };

    useEffect(() => {
        if (selectedId) {
            const selectedNode = stageRef.current?.findOne('#' + selectedId);
            if (selectedNode) {
                transformerRef.current?.nodes([selectedNode]);
                transformerRef.current?.getLayer().batchDraw();
            }
        } else {
            transformerRef.current?.nodes([]);
        }
    }, [selectedId]);

    const selectedElement = elements.find(e => e.id === selectedId);



    return (
        <div className="flex flex-col h-[calc(100vh-150px)]">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4 bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 overflow-x-auto pb-2 sm:pb-0">
                    {/* Office Location Selector */}
                    <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">Office</span>
                        <div className="flex items-center gap-2">
                            <select 
                                className="form-select bg-gray-50 dark:bg-[#1b2e4b] border-gray-200 dark:border-gray-700 rounded-lg pr-10 font-bold text-sm min-w-[180px] cursor-pointer hover:border-primary transition-colors focus:ring-primary shadow-sm"
                                value={selectedLocation?.id || ''}
                                onChange={(e) => {
                                    const loc = locations.find(l => l.id === parseInt(e.target.value));
                                    if (loc) handleLocationSelect(loc);
                                }}
                            >
                                <option value="" disabled>Select Office...</option>
                                {locations.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
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

                    <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">Floors</span>
                        {loadingFloors && <span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></span>}
                    </div>
                    
                    {!selectedLocation ? (
                         <span className="text-sm font-medium text-gray-400 italic">Please select an office →</span>
                    ) : floors.length === 0 && !loadingFloors ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-400 italic">No floors found.</span>
                        </div>
                    ) : (
                        <div className="relative group">
                            <select 
                                className="form-select bg-gray-50 dark:bg-[#1b2e4b] border-gray-200 dark:border-gray-700 rounded-lg pr-10 font-bold text-sm min-w-[180px] cursor-pointer hover:border-primary transition-colors focus:ring-primary shadow-sm"
                                value={selectedFloor?.id || ''}
                                onChange={(e) => {
                                    const floor = floors.find(f => f.id === parseInt(e.target.value));
                                    if (floor) handleFloorSelect(floor);
                                }}
                            >
                                <option value="" disabled>Select Floor...</option>
                                {floors.map(f => (
                                    <option key={f.id} value={f.id}>
                                        F{f.floor_number}: {f.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    <button 
                        onClick={handleAddFloor}
                        disabled={!selectedLocation}
                        className={`p-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm ${!selectedLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Add New Floor"
                    >
                        <IconPlus className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSave}
                        disabled={!selectedFloor}
                        className={`btn btn-primary gap-2 px-6 ${!selectedFloor ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <IconSave className="w-5 h-5" />
                        Save Layout
                    </button>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Sidebar: Elements */}
                <div className="w-64 flex flex-col gap-6">
                    <div className="panel bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm relative overflow-hidden">
                        {!selectedFloor && (
                            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 z-10 flex items-center justify-center text-center p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select a floor first</p>
                            </div>
                        )}
                        <div className="flex items-center justify-between mb-4">
                            <h6 className="font-bold uppercase text-xs tracking-widest text-gray-400">
                                {elements.length > 0 ? 'Modify Structure' : 'Create Structure'}
                            </h6>
                            {elements.length > 0 && (
                                <span className="badge badge-outline-primary text-[10px]">Editing</span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => addElement('seat')} className="flex flex-col items-center gap-2 p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 rounded-xl hover:scale-105 transition-transform">
                                <IconUsers className="w-6 h-6 text-green-600" />
                                <span className="text-xs font-bold text-green-700">Seat</span>
                            </button>
                            <button onClick={() => addElement('zone')} className="flex flex-col items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl hover:scale-105 transition-transform">
                                <IconLayout className="w-6 h-6 text-blue-600" />
                                <span className="text-xs font-bold text-blue-700">Zone</span>
                            </button>
                            <button onClick={() => addElement('room')} className="flex flex-col items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl hover:scale-105 transition-transform">
                                <IconLayout className="w-6 h-6 text-indigo-600" />
                                <span className="text-xs font-bold text-indigo-700">Room</span>
                            </button>
                            <button onClick={() => addElement('label')} className="flex flex-col items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800 rounded-xl hover:scale-105 transition-transform">
                                <IconNotes className="w-6 h-6 text-yellow-600" />
                                <span className="text-xs font-bold text-yellow-700">Label</span>
                            </button>
                            <button onClick={() => addElement('door')} className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:scale-105 transition-transform">
                                <div className="w-6 h-6 border-l-2 border-b-2 border-gray-400 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-full h-full border-r-2 border-gray-400 origin-bottom-left -rotate-45"></div>
                                </div>
                                <span className="text-xs font-bold text-gray-600">Door</span>
                            </button>
                        </div>
                    </div>

                    {selectedElement && (
                        <div className="panel bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm animate-fade-in-down">
                            <div className="flex items-center justify-between mb-4">
                                <h6 className="font-bold uppercase text-xs tracking-widest text-gray-400">Properties</h6>
                                <button onClick={deleteElement} className="text-danger hover:text-red-700">
                                    <IconTrash className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold mb-1 block">Label</label>
                                    <input 
                                        type="text" 
                                        value={selectedElement.name} 
                                        onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
                                        className="form-input text-sm"
                                    />
                                </div>
                                {(selectedElement.type === 'zone' || selectedElement.type === 'room' || selectedElement.type === 'label') && (
                                    <div>
                                        <label className="text-xs font-bold mb-1 block">Color</label>
                                        <input 
                                            type="color" 
                                            value={selectedElement.color} 
                                            onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                                            className="w-full h-8 rounded cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Canvas */}
                <div className="flex-1 bg-gray-100 dark:bg-black/20 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 relative shadow-inner">
                    <Stage
                        width={1000}
                        height={800}
                        onMouseDown={checkDeselect}
                        onTouchStart={checkDeselect}
                        ref={stageRef}
                        className="bg-white dark:bg-[#1a2233]"
                        style={{ backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    >
                        <Layer>
                            {elements.map((el) => {
                                if (el.type === 'zone' || el.type === 'room') {
                                    return (
                                        <Group
                                            key={el.id}
                                            id={el.id}
                                            x={el.x}
                                            y={el.y}
                                            rotation={el.rotation}
                                            draggable
                                            onDragEnd={(e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() })}
                                            onClick={() => setSelectedId(el.id)}
                                            onTransformEnd={(e) => {
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
                                                fill={el.type === 'room' ? el.color + '33' : el.color + '22'}
                                                stroke={el.color}
                                                strokeWidth={el.type === 'room' ? 3 : 2}
                                                dash={el.type === 'room' ? [] : [5, 5]}
                                            />
                                            <Text
                                                text={el.name}
                                                fontSize={12}
                                                fontStyle="bold"
                                                fill={el.color}
                                                padding={10}
                                            />
                                        </Group>
                                    );
                                }
                                if (el.type === 'seat') {
                                    return (
                                        <Group
                                            key={el.id}
                                            id={el.id}
                                            x={el.x}
                                            y={el.y}
                                            rotation={el.rotation}
                                            draggable
                                            onDragEnd={(e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() })}
                                            onClick={() => setSelectedId(el.id)}
                                            onTransformEnd={(e) => {
                                                const node = e.target;
                                                const scaleX = node.scaleX();
                                                const scaleY = node.scaleY();
                                                
                                                node.scaleX(1);
                                                node.scaleY(1);
                                                
                                                updateElement(el.id, {
                                                    x: node.x(),
                                                    y: node.y(),
                                                    width: Math.max(10, el.width * scaleX),
                                                    height: Math.max(10, el.height * scaleY),
                                                    rotation: node.rotation()
                                                });
                                            }}
                                        >
                                            <Rect
                                                width={el.width}
                                                height={el.height}
                                                fill={selectedId === el.id ? '#3B82F6' : '#10B981'}
                                                cornerRadius={8}
                                                shadowBlur={5}
                                                shadowColor="#00000022"
                                            />
                                            <Text
                                                width={el.width}
                                                height={el.height}
                                                text={el.name}
                                                fontSize={10}
                                                fontStyle="bold"
                                                fill="white"
                                                align="center"
                                                verticalAlign="middle"
                                            />
                                        </Group>
                                    );
                                }
                                if (el.type === 'door') {
                                    return (
                                        <Group
                                            key={el.id}
                                            id={el.id}
                                            x={el.x}
                                            y={el.y}
                                            rotation={el.rotation}
                                            draggable
                                            onDragStayed={(e: any) => e.target.getStage().container().style.cursor = 'move'}
                                            onDragEnd={(e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() })}
                                            onClick={() => setSelectedId(el.id)}
                                            onTransformEnd={(e) => {
                                                const node = e.target;
                                                const scaleX = node.scaleX();
                                                const scaleY = node.scaleY();
                                                
                                                node.scaleX(1);
                                                node.scaleY(1);
                                                
                                                updateElement(el.id, {
                                                    x: node.x(),
                                                    y: node.y(),
                                                    width: Math.max(20, el.width * scaleX),
                                                    height: Math.max(10, el.height * scaleY),
                                                    rotation: node.rotation()
                                                });
                                            }}
                                        >
                                            {/* Hit Area for easier selection */}
                                            <Rect
                                                width={el.width}
                                                height={el.width}
                                                y={-el.width}
                                                fill="transparent"
                                            />
                                            {/* Threshold / Wall segment */}
                                            <Rect
                                                width={el.width}
                                                height={4}
                                                y={-2}
                                                fill="#9CA3AF"
                                                opacity={0.5}
                                            />
                                            {/* Door Jambs */}
                                            <Rect width={4} height={8} x={0} y={-4} fill="#6B7280" />
                                            <Rect width={4} height={8} x={el.width - 4} y={-4} fill="#6B7280" />
                                            
                                            {/* The Door Leaf - Open 90 degrees */}
                                            <Rect
                                                width={4}
                                                height={el.width}
                                                x={0}
                                                y={-el.width}
                                                fill="#9CA3AF"
                                                stroke="#6B7280"
                                                strokeWidth={1}
                                            />
                                            
                                            {/* The Swing Arc - 90 degrees */}
                                            <Arc
                                                x={0}
                                                y={0}
                                                innerRadius={el.width - 1}
                                                outerRadius={el.width}
                                                angle={90}
                                                rotation={-90}
                                                fill="#9CA3AF"
                                                opacity={0.2}
                                            />
                                            <Arc
                                                x={0}
                                                y={0}
                                                innerRadius={el.width}
                                                outerRadius={el.width}
                                                angle={90}
                                                rotation={-90}
                                                stroke="#9CA3AF"
                                                strokeWidth={1}
                                                dash={[4, 4]}
                                            />
                                        </Group>
                                    );
                                }
                                if (el.type === 'label') {
                                    return (
                                        <Group
                                            key={el.id}
                                            id={el.id}
                                            x={el.x}
                                            y={el.y}
                                            rotation={el.rotation}
                                            draggable
                                            onDragEnd={(e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() })}
                                            onClick={() => setSelectedId(el.id)}
                                            onTransformEnd={(e) => {
                                                const node = e.target;
                                                const scaleX = node.scaleX();
                                                const scaleY = node.scaleY();
                                                node.scaleX(1);
                                                node.scaleY(1);
                                                updateElement(el.id, {
                                                    x: node.x(),
                                                    y: node.y(),
                                                    width: Math.max(20, el.width * scaleX),
                                                    height: Math.max(10, el.height * scaleY),
                                                    rotation: node.rotation()
                                                });
                                            }}
                                        >
                                            <Text
                                                text={el.name}
                                                fontSize={16}
                                                fontStyle="bold"
                                                fill={el.color}
                                                width={el.width}
                                                align="center"
                                            />
                                        </Group>
                                    );
                                }
                                return null;
                            })}
                            <Transformer ref={transformerRef} rotateEnabled />
                        </Layer>
                    </Stage>
                </div>
            </div>
        </div>
    );
};

export default OfficeStructure;
