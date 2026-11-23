import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvailabilityCard } from './availability-card';

describe('AvailabilityCard', () => {
  let component: AvailabilityCard;
  let fixture: ComponentFixture<AvailabilityCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvailabilityCard],
    }).compileComponents();

    fixture = TestBed.createComponent(AvailabilityCard);
    component = fixture.componentInstance;
    component.availability = {
      id: 1,
      date: '2026-11-20',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
      breakTime: 0,
      status: 'Disponible',
      createdAt: '2026-11-19T00:00:00Z',
    };
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
