class PayrollData {
  final double amount;
  final String date;

  PayrollData({required this.amount, required this.date});

  factory PayrollData.fromJson(Map<String, dynamic> json) {
    return PayrollData(
      amount: (json['amount'] ?? 0).toDouble(),
      date: json['date'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {'amount': amount, 'date': date};
  }

  String get formattedAmount {
    // Format with Indian currency style
    return '₹${amount.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}';
  }
}
