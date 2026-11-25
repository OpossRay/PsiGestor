import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { PipgChartComponent } from './pipg-chart.component';

describe('PipgChartComponent', () => {
  let component: PipgChartComponent;
  let fixture: ComponentFixture<PipgChartComponent>;

  const mockDirectScores: Record<string, number> = {
    A: 25,
    R: 24,
    E: 28,
    S: 22,
    AE: 99,
    C: 30,
    O: 27,
    P: 25,
    V: 26,
  };

  const mockPercentileScores: Record<string, number | null> = {
    A: 73,
    R: 48,
    E: 78,
    S: 47,
    C: 79,
    O: 68,
    P: 53,
    V: 59,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PipgChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PipgChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the chart component', () => {
    expect(component).toBeTruthy();
  });

  it('should structure exactly three sections: PPG, Autoestima and IPG', () => {
    fixture.componentRef.setInput('directScores', mockDirectScores);
    fixture.componentRef.setInput('percentileScores', mockPercentileScores);
    fixture.detectChanges();

    const sections = component.sections;
    expect(sections.length).toBe(3);
    expect(sections[0].title).toContain('PPG');
    expect(sections[0].dimensions.length).toBe(4);
    expect(sections[1].title).toContain('Autoestima');
    expect(sections[1].isAutoestima).toBe(true);
    expect(sections[1].dimensions.length).toBe(1);
    expect(sections[2].title).toContain('IPG');
    expect(sections[2].dimensions.length).toBe(4);
  });

  it('should correctly map direct and percentile scores into dimensions', () => {
    fixture.componentRef.setInput('directScores', mockDirectScores);
    fixture.componentRef.setInput('percentileScores', mockPercentileScores);
    fixture.detectChanges();

    const ppg = component.sections[0].dimensions;
    const dimA = ppg.find((d) => d.key === 'A');
    expect(dimA).toBeTruthy();
    expect(dimA?.directScore).toBe(25);
    expect(dimA?.percentile).toBe(73);
    expect(dimA?.levelText).toBe('Promedio');
    expect(dimA?.levelClass).toBe('level-average');

    const dimE = ppg.find((d) => d.key === 'E');
    expect(dimE?.percentile).toBe(78);
    expect(dimE?.levelText).toBe('Alto');
    expect(dimE?.levelClass).toBe('level-high');
  });

  it('should not treat Autoestima (AE) as percentile', () => {
    fixture.componentRef.setInput('directScores', mockDirectScores);
    fixture.componentRef.setInput('percentileScores', mockPercentileScores);
    fixture.detectChanges();

    const aeSection = component.sections[1];
    const aeDim = aeSection.dimensions[0];
    expect(aeDim.key).toBe('AE');
    expect(aeDim.directScore).toBe(99);
    expect(aeDim.percentile).toBeNull();
    expect(aeDim.isPercentileAvailable).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('99 puntos');
    expect(compiled.textContent).toContain('Sin baremo percentil');
  });

  it('should calculate bar width safely with clamping', () => {
    expect(component.getBarWidth(null)).toBe(0);
    expect(component.getBarWidth(undefined as any)).toBe(0);
    expect(component.getBarWidth(-10)).toBe(0);
    expect(component.getBarWidth(50)).toBe(50);
    expect(component.getBarWidth(120)).toBe(100);
  });

  it('should handle empty or null scores gracefully without crashing', () => {
    fixture.componentRef.setInput('directScores', null);
    fixture.componentRef.setInput('percentileScores', null);
    fixture.detectChanges();

    const sections = component.sections;
    expect(sections.length).toBe(3);
    expect(sections[0].dimensions[0].directScore).toBe(0);
    expect(sections[0].dimensions[0].percentile).toBeNull();
  });
});
