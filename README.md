# MSC

## Using the API 

### `/getEmails`

Hit the `/getEmails` endpoint to get all emails in the database. To filter this list, add values to the `statuses` endpoint, like so:

 - `/getEmails?statuses=active` returns all active members
 - `/getEmails?statuses=active,inactive,life,applicant,honorary` returns all the people who have a status likely to be emailed by the president in one blast

All statuses:
 - active
 - inactive
 - life
 - junior
 - child
 - honorary
 - applicant