from app.models import OfficeFloor, OfficeSection, OfficeSeat

def run():
    print("Starting seat synchronization...")
    count = 0
    for floor in OfficeFloor.objects.all():
        layout = floor.layout_data
        if not layout or 'elements' not in layout:
            continue
            
        section, _ = OfficeSection.objects.get_or_create(
            floor=floor, 
            name="Main Section"
        )
        
        layout_seats = [e for e in layout['elements'] if e.get('type') == 'seat']
        seat_numbers = []
        
        for ls in layout_seats:
            seat_num = str(ls.get('name'))
            if not seat_num:
                continue
            
            seat_numbers.append(seat_num)
            OfficeSeat.objects.update_or_create(
                section=section,
                seat_number=seat_num,
                defaults={
                    'position_x': ls.get('x', 0),
                    'position_y': ls.get('y', 0),
                    'rotation': ls.get('rotation', 0),
                    'is_available': True
                }
            )
            count += 1
            
        # Clean up seats not in layout
        # OfficeSeat.objects.filter(section=section).exclude(seat_number__in=seat_numbers).delete()
        
        print(f"Synced {len(layout_seats)} seats for floor: {floor.name}")
    
    print(f"Finished. Total seats synced: {count}")

if __name__ == "__main__":
    run()
