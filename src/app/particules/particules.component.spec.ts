import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticulesComponent } from './particules.component';

describe('ParticulesComponent', () => {
  let component: ParticulesComponent;
  let fixture: ComponentFixture<ParticulesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ParticulesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParticulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
