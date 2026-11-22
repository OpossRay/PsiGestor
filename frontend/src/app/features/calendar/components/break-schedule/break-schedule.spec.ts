import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreakSchedule } from './break-schedule';

describe('BreakSchedule', () => {
  let component: BreakSchedule;
  let fixture: ComponentFixture<BreakSchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreakSchedule],
    }).compileComponents();

    fixture = TestBed.createComponent(BreakSchedule);
    component = fixture.componentInstance;
    component.config = {
      enabled: false,
      startTime: '10:00',
      endTime: '11:00',
    };
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
