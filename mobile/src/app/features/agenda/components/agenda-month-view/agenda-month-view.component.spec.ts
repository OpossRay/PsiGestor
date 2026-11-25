import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgendaMonthViewComponent } from './agenda-month-view.component';
import { Availability } from '../../../../core/models/availability.model';

describe('AgendaMonthViewComponent', () => {
  let component: AgendaMonthViewComponent;
  let fixture: ComponentFixture<AgendaMonthViewComponent>;

  const mockAvailabilities: Availability[] = [
    {
      id: 1,
      date: '2026-11-20',
      startTime: '09:00:00',
      endTime: '09:45:00',
      duration: 45,
      breakTime: 15,
      status: 'Reservado',
      studentName: 'Ana García'
    },
    {
      id: 2,
      date: '2026-11-25',
      startTime: '23:00:00',
      endTime: '23:45:00',
      duration: 45,
      breakTime: 15,
      status: 'Disponible'
    },
    {
      id: 3,
      date: '2026-11-26',
      startTime: '11:00:00',
      endTime: '11:45:00',
      duration: 45,
      breakTime: 15,
      status: 'Reprogramacion pendiente',
      studentName: 'Pedro López'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaMonthViewComponent],
      providers: [provideIonicAngular()]
    }).compileComponents();

    fixture = TestBed.createComponent(AgendaMonthViewComponent);
    component = fixture.componentInstance;
    component.selectedDate = new Date(2026, 10, 25); // Noviembre 2026
    component.availabilities = mockAvailabilities;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the month and year formatted title', () => {
    expect(component.formattedMonthYear).toBe('Noviembre 2026');
  });

  it('should generate month calendar cells and identify available, reserved, and reschedule days', () => {
    const cells = component.monthCalendarCells;
    expect(cells.length).toBeGreaterThanOrEqual(35);

    // Day 20 had Reservado
    const cell20 = cells.find(c => c.dateStr === '2026-11-20');
    expect(cell20).toBeDefined();
    expect(cell20?.hasReserved).toBe(true);

    // Day 25 had Disponible
    const cell25 = cells.find(c => c.dateStr === '2026-11-25');
    expect(cell25).toBeDefined();
    expect(cell25?.hasAvailable).toBe(true);

    // Day 26 had Reprogramacion pendiente
    const cell26 = cells.find(c => c.dateStr === '2026-11-26');
    expect(cell26).toBeDefined();
    expect(cell26?.hasReschedule).toBe(true);
  });

  it('should emit monthChange when navigating previous and next month', () => {
    const monthChangeSpy = vi.spyOn(component.monthChange, 'emit');

    component.onPrevMonth();
    expect(monthChangeSpy).toHaveBeenCalledWith(-1);

    component.onNextMonth();
    expect(monthChangeSpy).toHaveBeenCalledWith(1);
  });

  it('should emit dateSelect when selecting a day cell', () => {
    const dateSelectSpy = vi.spyOn(component.dateSelect, 'emit');
    const targetDate = new Date(2026, 10, 25);

    component.onSelectDate(targetDate);
    expect(dateSelectSpy).toHaveBeenCalledWith(targetDate);
  });

  it('should return selected day items safely even if startTime is undefined', () => {
    component.availabilities = [
      {
        id: 99,
        date: '2026-11-25',
        startTime: '',
        endTime: '',
        duration: 45,
        breakTime: 15,
        status: 'Disponible'
      }
    ];

    const items = component.selectedDayItems;
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(99);
  });

  it('should emit bookSlot when clicking an available slot and slotClick for reserved slot', () => {
    const bookSlotSpy = vi.spyOn(component.bookSlot, 'emit');
    const slotClickSpy = vi.spyOn(component.slotClick, 'emit');

    const availableSlot = mockAvailabilities[1];
    component.onItemClick(availableSlot);
    expect(bookSlotSpy).toHaveBeenCalledWith(availableSlot);
    expect(slotClickSpy).not.toHaveBeenCalled();

    const reservedSlot = mockAvailabilities[0];
    component.onItemClick(reservedSlot);
    expect(slotClickSpy).toHaveBeenCalledWith(reservedSlot);
  });
});
