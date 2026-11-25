import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonFooter } from '@ionic/angular';

export type BottomNavTab = 'agenda' | 'gestion-citas' | 'evaluaciones' | 'disponibilidad' | 'mas';

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss'],
  standalone: true,
  imports: [CommonModule, IonFooter]
})
export class BottomNavComponent {
  @Input() activeTab: BottomNavTab | string = 'agenda';
  @Output() tabChange = new EventEmitter<BottomNavTab>();

  selectTab(tab: BottomNavTab): void {
    if (this.activeTab !== tab) {
      this.tabChange.emit(tab);
    }
  }
}
