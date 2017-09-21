# MSC

## Using the API 

### `/getEmails`

Hit the `/getEmails` endpoint to get all emails in the database. To filter this list, use the `statuses` parameter like so:

 - `/getEmails?statuses=active` returns all active members
 - `/getEmails?statuses=active,inactive,life,applicant,honorary` returns all the people who have a status likely to be emailed by the president in one blast

Statuses can be added in any order, and need to be separated by commas (without spaces).

Values that can be added to the `statuses` parameter to filter the list:
 - active
 - inactive
 - life
 - junior
 - child
 - honorary
 - applicant
 - non-member