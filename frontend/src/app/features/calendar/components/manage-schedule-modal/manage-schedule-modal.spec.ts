import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageScheduleModal } from './manage-schedule-modal';

describe('ManageScheduleModal', () => {
  let component: ManageScheduleModal;
  let fixture: ComponentFixture<ManageScheduleModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageScheduleModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageScheduleModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
