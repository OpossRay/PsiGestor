import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, calendarOutline, bookmarkOutline, personOutline } from 'ionicons/icons';

export type StudentNavTab = 'inicio' | 'agendar' | 'mis-citas' | 'perfil';

@Component({
  selector: 'app-student-bottom-nav',
  templateUrl: './student-bottom-nav.component.html',
  styleUrls: ['./student-bottom-nav.component.scss'],
  standalone: true,
  imports: [CommonModule, IonFooter, IonIcon]
})
export class StudentBottomNavComponent {
  @Input() activeTab: StudentNavTab | string = 'agendar';
  @Output() tabChange = new EventEmitter<StudentNavTab>();

  constructor() {
    addIcons({
      homeOutline,
      calendarOutline,
      bookmarkOutline,
      personOutline
    });
  }

  selectTab(tab: StudentNavTab): void {
    if (this.activeTab !== tab) {
      this.tabChange.emit(tab);
    }
  }
}
