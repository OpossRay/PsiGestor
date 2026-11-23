
import { Component } from '@angular/core';
import { Calendar } from '../../../calendar/components/calendar/calendar';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [Calendar],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css'
})
export class Agenda {}
