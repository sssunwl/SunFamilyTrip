import { describe, expect, it } from 'vitest';
import { parseGoogleMapsPlace } from '../src/lib/maps';

describe('Google Maps 完整連結解析', () => {
  it('解析店名、當地名稱、座標與 Place ID', () => {
    const place = parseGoogleMapsPlace(
      '海雲台藍線公園',
      'https://www.google.com/maps/place/%ED%95%B4%EC%9A%B4%EB%8C%80+%EB%B8%94%EB%A3%A8%EB%9D%BC%EC%9D%B8%ED%8C%8C%ED%81%AC/@35.1611,129.1914,17z/data=!4m6!3m5!1sChIJExample123!8m2',
    );
    expect(place.name).toBe('海雲台藍線公園');
    expect(place.localName).toBe('해운대 블루라인파크');
    expect(place.lat).toBe(35.1611);
    expect(place.lng).toBe(129.1914);
    expect(place.placeId).toBe('ChIJExample123');
  });

  it('解析失敗時仍保留店名與原連結', () => {
    const place = parseGoogleMapsPlace('街角咖啡', 'https://example.com/cafe');
    expect(place).toEqual({ name: '街角咖啡', mapUrl: 'https://example.com/cafe' });
  });
});
