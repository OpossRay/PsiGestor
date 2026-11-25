import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BottomNavComponent } from './bottom-nav.component';

describe('BottomNavComponent', () => {
  let component: BottomNavComponent;
  let fixture: ComponentFixture<BottomNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have 5 navigation buttons including Evaluaciones', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('.psi-nav-item');
    expect(buttons.length).toBe(5);

    const buttonTexts = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(buttonTexts).toContain('Agenda');
    expect(buttonTexts).toContain('Citas');
    expect(buttonTexts).toContain('Evaluac.');
    expect(buttonTexts).toContain('Disponib.');
    expect(buttonTexts).toContain('Perfil');
  });

  it('should emit tabChange when a different tab is clicked', () => {
    const tabSpy = vi.spyOn(component.tabChange, 'emit');
    component.activeTab = 'agenda';

    component.selectTab('evaluaciones');
    expect(tabSpy).toHaveBeenCalledWith('evaluaciones');
  });

  it('should not emit tabChange if the clicked tab is already active', () => {
    const tabSpy = vi.spyOn(component.tabChange, 'emit');
    component.activeTab = 'evaluaciones';

    component.selectTab('evaluaciones');
    expect(tabSpy).not.toHaveBeenCalled();
  });
});
