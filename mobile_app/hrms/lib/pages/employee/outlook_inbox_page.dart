import 'package:flutter/material.dart';

import '../../services/outlook_service.dart';
import 'widgets/outlook_mail_widgets.dart';

class OutlookInboxPage extends StatefulWidget {
  const OutlookInboxPage({super.key});

  @override
  State<OutlookInboxPage> createState() => _OutlookInboxPageState();
}

class _OutlookInboxPageState extends State<OutlookInboxPage> {
  @override
  void initState() {
    super.initState();
    OutlookService.refresh(force: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Outlook Inbox'),
        actions: [
          IconButton(
            tooltip: 'Open in Outlook',
            icon: const Icon(Icons.open_in_new_rounded),
            onPressed: () => openOutlookLink(OutlookService.inbox.value?.inboxUrl ?? 'https://outlook.office.com/mail/inbox'),
          ),
        ],
      ),
      body: ValueListenableBuilder<OutlookInbox?>(
        valueListenable: OutlookService.inbox,
        builder: (context, inbox, _) => RefreshIndicator(
          onRefresh: () => OutlookService.refresh(force: true),
          child: inbox?.connected == true && inbox!.messages.isNotEmpty
              ? ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  itemCount: inbox.messages.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (_, i) => OutlookMailTile(message: inbox.messages[i]),
                )
              : ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    ValueListenableBuilder<String?>(
                      valueListenable: OutlookService.error,
                      builder: (_, err, _) => OutlookStatusMessage(inbox: inbox, error: err),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
