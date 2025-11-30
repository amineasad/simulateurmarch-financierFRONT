import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'newlineToBr' })
export class NewlineToBrPipe implements PipeTransform {
  transform(value: string): string {
    // Version 100% compatible (aucun ?., aucun ??)
    if (!value) return '';
    return value.replace(/\n/g, '<br>');
  }
}