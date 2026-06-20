export interface Aisle {
  id: string;
  name: string;
  panorama: string;
  placeholderColor: string;
  // Rotación Y inicial del cielo, en grados (default 0). Sirve para alinear el
  // corredor del pasillo hacia el frente (-Z): así, al aterrizar, mirás el
  // pasillo largo (no una góndola) y el efecto de vuelo se siente como caminar
  // por el pasillo. Se calibra por foto (cada panorámica tiene el corredor en
  // un ángulo distinto). Positivo gira el cielo en sentido antihorario.
  heading?: number;
}

export interface AislesData {
  aisles: Aisle[];
}
