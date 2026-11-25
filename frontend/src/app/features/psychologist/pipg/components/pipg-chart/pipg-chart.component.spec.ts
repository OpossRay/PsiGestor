import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PipgChartComponent } from './pipg-chart.component';

describe('PipgChartComponent', () => {
  let component: PipgChartComponent;
  let fixture: ComponentFixture<PipgChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PipgChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PipgChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render 3 distinct instrument sections: PPG, Autoestima, IPG', () => {
    const sections = component.sections;
    expect(sections.length).toBe(3);
    expect(sections[0].title).toContain('PPG');
    expect(sections[1].title).toContain('Autoestima');
    expect(sections[1].isAutoestima).toBe(true);
    expect(sections[2].title).toContain('IPG');
  });

  it('should calculate correct level classes for percentiles', () => {
    fixture.componentRef.setInput('directScores', {
      A: 25,
      R: 20,
      E: 15,
      S: 22,
      AE: 82,
      C: 18,
      O: 24,
      P: 19,
      V: 21
    });
    fixture.componentRef.setInput('percentileScores', {
      A: 85,
      R: 50,
      E: 15,
      S: 75,
      C: 25,
      O: 90,
      P: 10,
      V: 60
    });
    fixture.detectChanges();

    const sections = component.sections;
    const ppgDimensions = sections[0].dimensions;

    // A: 85 -> Alto / level-high
    expect(ppgDimensions[0].percentile).toBe(85);
    expect(ppgDimensions[0].levelText).toBe('Alto');
    expect(ppgDimensions[0].levelClass).toBe('level-high');

    // R: 50 -> Promedio / level-average
    expect(ppgDimensions[1].percentile).toBe(50);
    expect(ppgDimensions[1].levelText).toBe('Promedio');
    expect(ppgDimensions[1].levelClass).toBe('level-average');

    // E: 15 -> Bajo / level-low
    expect(ppgDimensions[2].percentile).toBe(15);
    expect(ppgDimensions[2].levelText).toBe('Bajo');
    expect(ppgDimensions[2].levelClass).toBe('level-low');
  });

  it('should present Autoestima as composite direct score without invented percentile', () => {
    fixture.componentRef.setInput('directScores', {
      A: 20,
      R: 20,
      E: 20,
      S: 20,
      AE: 80
    });
    fixture.detectChanges();

    const sections = component.sections;
    const aeSection = sections[1];
    expect(aeSection.isAutoestima).toBe(true);

    const aeDim = aeSection.dimensions[0];
    expect(aeDim.key).toBe('AE');
    expect(aeDim.directScore).toBe(80);
    expect(aeDim.isPercentileAvailable).toBe(false);
    expect(aeDim.percentile).toBeNull();
  });

  it('should bound bar width between 0 and 100', () => {
    expect(component.getBarWidth(null)).toBe(0);
    expect(component.getBarWidth(-5)).toBe(0);
    expect(component.getBarWidth(45)).toBe(45);
    expect(component.getBarWidth(110)).toBe(100);
  });
});
