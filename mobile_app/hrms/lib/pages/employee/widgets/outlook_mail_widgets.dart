import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../services/outlook_service.dart';
import '../../../theme/app_stitch_theme.dart';
import '../outlook_inbox_page.dart';

const outlookBlue = Color(0xFF0078D4);

Future<void> openOutlookLink(String? url) async {
  final uri = Uri.tryParse(url ?? '');
  if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
}

void openOutlookInbox(BuildContext context) =>
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const OutlookInboxPage()));

class OutlookMailTile extends StatelessWidget {
  const OutlookMailTile({super.key, required this.message});
  final OutlookMessage message;

  @override
  Widget build(BuildContext context) {
    final m = message;
    final strong = !m.isRead;
    return InkWell(
      onTap: () => openOutlookLink(m.webLink),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 6, right: 10),
              width: 8,
              height: 8,
              decoration: BoxDecoration(shape: BoxShape.circle, color: strong ? outlookBlue : Colors.transparent),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Expanded(
                      child: Text(m.fromName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: strong ? FontWeight.w800 : FontWeight.w500,
                              color: AppStitchTheme.lightOnSurface)),
                    ),
                    Text(OutlookService.formatTime(m.receivedAt),
                        style: TextStyle(fontSize: 11, color: AppStitchTheme.lightOnSurfaceMuted)),
                  ]),
                  const SizedBox(height: 2),
                  Text(
                    '${m.isImportant ? '! ' : ''}${m.hasAttachments ? '📎 ' : ''}${m.subject}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: strong ? FontWeight.w700 : FontWeight.w400,
                        color: AppStitchTheme.lightOnSurface),
                  ),
                  if (m.preview.isNotEmpty)
                    Text(m.preview,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12, color: AppStitchTheme.lightOnSurfaceMuted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class OutlookStatusMessage extends StatelessWidget {
  const OutlookStatusMessage({super.key, required this.inbox, required this.error});
  final OutlookInbox? inbox;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final text = inbox == null
        ? (error ?? 'Loading mail…')
        : !inbox!.connected
            ? 'Sign out and sign in again with Microsoft to see your Outlook inbox here.'
            : 'Your inbox is empty.';
    return Padding(
      padding: const EdgeInsets.all(18),
      child: Text(text, textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: AppStitchTheme.lightOnSurfaceMuted)),
    );
  }
}

/// Dashboard card: latest 5 inbox messages.
class OutlookMailCard extends StatefulWidget {
  const OutlookMailCard({super.key});

  @override
  State<OutlookMailCard> createState() => _OutlookMailCardState();
}

class _OutlookMailCardState extends State<OutlookMailCard> {
  @override
  void initState() {
    super.initState();
    OutlookService.refresh();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<OutlookInbox?>(
      valueListenable: OutlookService.inbox,
      builder: (context, inbox, _) {
        final msgs = inbox?.connected == true ? inbox!.messages.take(5).toList() : const <OutlookMessage>[];
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppStitchTheme.primary.withValues(alpha: 0.10)),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 6, 6),
                child: Row(children: [
                  const Icon(Icons.mail_rounded, color: outlookBlue, size: 20),
                  const SizedBox(width: 8),
                  Text('Outlook Inbox',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppStitchTheme.lightOnSurface)),
                  if ((inbox?.unreadCount ?? 0) > 0) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: outlookBlue.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: Text('${inbox!.unreadCount} unread',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: outlookBlue)),
                    ),
                  ],
                  const Spacer(),
                  if (inbox?.connected == true)
                    TextButton(onPressed: () => openOutlookInbox(context), child: const Text('View all')),
                ]),
              ),
              if (msgs.isEmpty)
                ValueListenableBuilder<String?>(
                  valueListenable: OutlookService.error,
                  builder: (_, err, _) => OutlookStatusMessage(inbox: inbox, error: err),
                )
              else
                ...msgs.map((m) => OutlookMailTile(message: m)),
              const SizedBox(height: 6),
            ],
          ),
        );
      },
    );
  }
}
