import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/seat_booking_models.dart';
import 'http_client_service.dart';

class SeatBookingService {
  static List<T> _decodeList<T>(
    http.Response res,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    final decoded = jsonDecode(res.body);
    final list = decoded is List
        ? decoded
        : (decoded is Map && decoded['results'] is List ? decoded['results'] : null);
    if (list is! List) return <T>[];
    return list
        .whereType<Map>()
        .map((m) => fromJson(m.cast<String, dynamic>()))
        .toList();
  }

  static String _extractErrorMessage(http.Response res) {
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map) {
        final detail = decoded['detail'];
        if (detail != null) {
          if (detail is List && detail.isNotEmpty) return detail.first.toString();
          return detail.toString();
        }
        final nonField = decoded['non_field_errors'];
        if (nonField != null) {
          if (nonField is List && nonField.isNotEmpty) return nonField.first.toString();
          return nonField.toString();
        }
        if (decoded.isNotEmpty) {
          final first = decoded.values.first;
          if (first is List && first.isNotEmpty) return first.first.toString();
          return first.toString();
        }
      }
      if (decoded is String && decoded.isNotEmpty) return decoded;
    } catch (_) {
      // fall through
    }
    if (res.statusCode == 403) return 'You do not have permission to perform this action.';
    return 'Request failed (${res.statusCode})';
  }

  static Future<List<OfficeLocation>> fetchLocations() async {
    final res = await HttpClientService.get(ApiConfig.officeLocationsUrl);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return _decodeList(res, OfficeLocation.fromJson);
    }
    throw Exception(_extractErrorMessage(res));
  }

  static Future<List<OfficeFloor>> fetchFloors({required int locationId}) async {
    final res = await HttpClientService.get(ApiConfig.officeFloorsUrl(locationId: locationId));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return _decodeList(res, OfficeFloor.fromJson);
    }
    throw Exception(_extractErrorMessage(res));
  }

  static Future<List<OfficeSeat>> fetchSeats({required int floorId}) async {
    final res = await HttpClientService.get(ApiConfig.officeSeatsUrl(floorId: floorId));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return _decodeList(res, OfficeSeat.fromJson);
    }
    throw Exception(_extractErrorMessage(res));
  }

  static Future<List<SeatBooking>> fetchBookings({
    required String date,
    required int floorId,
    required String startTime,
    required String endTime,
    String? seatNumber,
    String? status,
    bool? history,
  }) async {
    final url = ApiConfig.seatBookingsUrl(
      date: date,
      floorId: floorId,
      startTime: startTime,
      endTime: endTime,
      seatNumber: seatNumber,
      status: status,
      history: history,
    );
    final res = await HttpClientService.get(url);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return _decodeList(res, SeatBooking.fromJson);
    }
    throw Exception(_extractErrorMessage(res));
  }

  static Future<List<SeatBooking>> fetchSeatSchedule({
    required int floorId,
    required String seatNumber,
  }) async {
    final url = ApiConfig.seatBookingsUrl(
      floorId: floorId,
      seatNumber: seatNumber,
    );
    final res = await HttpClientService.get(url);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return _decodeList(res, SeatBooking.fromJson);
    }
    throw Exception(_extractErrorMessage(res));
  }

  static Future<SeatBooking> createBooking({
    required int seatId,
    required String bookingType,
    required String startDate,
    String? endDate,
    required String startTime,
    required String endTime,
  }) async {
    final res = await HttpClientService.post(
      ApiConfig.seatBookingCreateUrl,
      body: <String, dynamic>{
        'seat': seatId,
        'start_date': startDate,
        'end_date': endDate,
        'start_time': startTime,
        'end_time': endTime,
        'booking_type': bookingType,
      },
    );
    if (res.statusCode >= 200 && res.statusCode < 300) {
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) {
        return SeatBooking.fromJson(decoded);
      }
      if (decoded is Map) {
        return SeatBooking.fromJson(decoded.cast<String, dynamic>());
      }
    }
    throw Exception(_extractErrorMessage(res));
  }

  static Future<void> cancelBooking({required int bookingId}) async {
    final res = await HttpClientService.post(ApiConfig.seatBookingCancelUrl(bookingId));
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    throw Exception(_extractErrorMessage(res));
  }
}

