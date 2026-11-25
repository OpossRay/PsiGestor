import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PipgChartDimension {
  key: string;
  name: string;
  description: string;
  directScore: number;
  percentile: number | null;
  isPercentileAvailable: boolean;
  levelText: string;
  levelClass: string;
}

export interface PipgChartSection {
  title: string;
  subtitle: string;
  isAutoestima?: boolean;
  dimensions: PipgChartDimension[];
}

@Component({
  selector: 'app-pipg-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pipg-chart.component.html',
  styleUrl: './pipg-chart.component.css'
})
export class PipgChartComponent {
  @Input() directScores: Record<string, number> | null = null;
  @Input() percentileScores: Record<string, number | null> | null = null;

  get sections(): PipgChartSection[] {
    const direct = this.directScores || {};
    const percentiles = this.percentileScores || {};

    const buildDimension = (
      key: string,
      name: string,
      description: string,
      isPercentileDimension = true
    ): PipgChartDimension => {
      const pd = typeof direct[key] === 'number' ? direct[key] : 0;
      const pc = isPercentileDimension && typeof percentiles[key] === 'number' ? percentiles[key] : null;
      const isAvailable = isPercentileDimension && pc !== null;

      let levelText = 'Sin baremo';
      let levelClass = 'level-none';

      if (isAvailable && pc !== null) {
        if (pc >= 75) {
          levelText = 'Alto';
          levelClass = 'level-high';
        } else if (pc >= 25) {
          levelText = 'Promedio';
          levelClass = 'level-average';
        } else {
          levelText = 'Bajo';
          levelClass = 'level-low';
        }
      }

      return {
        key,
        name,
        description,
        directScore: pd,
        percentile: pc,
        isPercentileAvailable: isAvailable,
        levelText,
        levelClass
      };
    };

    return [
      {
        title: 'PPG · Perfil Personal de Gordon',
        subtitle: 'Dimensiones fundamentales de personalidad y desenvolvimiento personal',
        dimensions: [
          buildDimension('A', 'Ascendencia', 'Seguridad en sí mismo, liderazgo y asertividad social'),
          buildDimension('R', 'Responsabilidad', 'Perseverancia, tenacidad, fiabilidad y determinación'),
          buildDimension('E', 'Estabilidad emocional', 'Equilibrio, serenidad, control emotivo y tolerancia'),
          buildDimension('S', 'Sociabilidad', 'Gusto por convivir e interactuar activamente con otros')
        ]
      },
      {
        title: 'Autoestima Global (A + R + E + S)',
        subtitle: 'Puntuación directa compuesta · Indicador de valía personal (Sin baremo percentil en C-14)',
        isAutoestima: true,
        dimensions: [
          buildDimension('AE', 'Autoestima', 'Puntuación compuesta de ajuste y aprecio por sí mismo', false)
        ]
      },
      {
        title: 'IPG · Inventario de Personalidad de Gordon',
        subtitle: 'Dimensiones complementarias de hábitos, cognición y relaciones sociales',
        dimensions: [
          buildDimension('C', 'Cautela', 'Prudencia, deliberación y manejo reflexivo de decisiones'),
          buildDimension('O', 'Originalidad', 'Creatividad, curiosidad intelectual y gusto por ideas nuevas'),
          buildDimension('P', 'Relaciones personales', 'Empatía, fe en las personas y tolerancia interpersonal'),
          buildDimension('V', 'Vigor', 'Energía, dinamismo, ritmo acelerado y vitalidad física/mental')
        ]
      }
    ];
  }

  getBarWidth(percentile: number | null): number {
    if (percentile === null || percentile === undefined) return 0;
    return Math.min(Math.max(percentile, 0), 100);
  }
}
