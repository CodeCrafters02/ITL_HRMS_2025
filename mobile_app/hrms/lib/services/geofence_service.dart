import 'dart:convert';
import 'dart:math';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../services/storage_service.dart';

class OfficeLocation {
  final int id;
  final String name;
  final double latitude;
  final double longitude;
  final double radius;

  const OfficeLocation({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.radius,
  });

  factory OfficeLocation.fromJson(Map<String, dynamic> json) {
    return OfficeLocation(
      id: json['id'] as int,
      name: json['name'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      radius: (json['radius'] as num).toDouble(),
    );
  }
}

class GeofenceConfig {
  final List<OfficeLocation> officeLocations;
  final bool isWfh;
  final bool geofenceRequired;

  const GeofenceConfig({
    required this.officeLocations,
    required this.isWfh,
    required this.geofenceRequired,
  });
}

class LocationStatus {
  final bool isAtOffice;
  final String? nearestOfficeName;
  final double? distanceMeters;
  final double? lat;
  final double? lon;

  const LocationStatus({
    required this.isAtOffice,
    this.nearestOfficeName,
    this.distanceMeters,
    this.lat,
    this.lon,
  });
}

class GeofenceService {
  static GeofenceConfig? _cachedConfig;

  static Future<GeofenceConfig?> fetchConfig() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return null;
      final response = await http.get(
        Uri.parse(ApiConfig.geofenceConfigUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _cachedConfig = GeofenceConfig(
          officeLocations: (data['office_locations'] as List? ?? [])
              .map((o) => OfficeLocation.fromJson(o))
              .toList(),
          isWfh: data['is_wfh'] ?? false,
          geofenceRequired: data['geofence_required'] ?? false,
        );
        return _cachedConfig;
      }
    } catch (_) {}
    return null;
  }

  static GeofenceConfig? get cachedConfig => _cachedConfig;

  static Future<Position?> getCurrentPosition() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return null;
      }
      if (permission == LocationPermission.deniedForever) return null;

      try {
        // Request the best accuracy possible and allow more warm-up time
        return await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.best,
            timeLimit: Duration(seconds: 15),
          ),
        );
      } catch (e) {
        // Fallback to last known position if active scan fails/times out (e.g. indoors)
        final lastKnown = await Geolocator.getLastKnownPosition();
        if (lastKnown != null) {
          // Only use if the cached coordinates are fresh (less than 5 minutes old)
          final age = DateTime.now().difference(lastKnown.timestamp);
          if (age.inMinutes < 5) {
            return lastKnown;
          }
        }
        rethrow;
      }
    } catch (_) {
      return null;
    }
  }

  static double _haversineDistance(
    double lat1, double lon1, double lat2, double lon2,
  ) {
    const r = 6371000.0;
    final dLat = _deg2rad(lat2 - lat1);
    final dLon = _deg2rad(lon2 - lon1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_deg2rad(lat1)) * cos(_deg2rad(lat2)) *
        sin(dLon / 2) * sin(dLon / 2);
    return r * 2 * atan2(sqrt(a), sqrt(1 - a));
  }

  static double _deg2rad(double deg) => deg * pi / 180;

  static LocationStatus checkStatus(Position position, GeofenceConfig config) {
    if (!config.geofenceRequired || config.isWfh) {
      return LocationStatus(
        isAtOffice: true,
        nearestOfficeName: config.isWfh ? 'Work From Home' : null,
        lat: position.latitude,
        lon: position.longitude,
      );
    }

    OfficeLocation? nearest;
    double? nearestDist;

    for (final loc in config.officeLocations) {
      final dist = _haversineDistance(
        position.latitude, position.longitude,
        loc.latitude, loc.longitude,
      );
      if (nearestDist == null || dist < nearestDist) {
        nearestDist = dist;
        nearest = loc;
      }
    }

    if (nearest != null && nearestDist != null && nearestDist <= nearest.radius) {
      return LocationStatus(
        isAtOffice: true,
        nearestOfficeName: nearest.name,
        distanceMeters: nearestDist,
        lat: position.latitude,
        lon: position.longitude,
      );
    }

    return LocationStatus(
      isAtOffice: false,
      nearestOfficeName: nearest?.name,
      distanceMeters: nearestDist,
      lat: position.latitude,
      lon: position.longitude,
    );
  }

  static Future<LocationStatus?> getLocationStatus() async {
    final config = _cachedConfig ?? await fetchConfig();
    if (config == null) return null;

    final position = await getCurrentPosition();
    if (position == null) return null;

    return checkStatus(position, config);
  }
}
