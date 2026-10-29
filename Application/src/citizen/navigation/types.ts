export type CitizenTabParamList = {
  Home: undefined;
  Records: undefined;
  Appointments: undefined;
  Schemes: undefined;
  Profile: undefined;
};

export type CitizenStackParamList = {
  CitizenTabs: undefined;
  RecordDetails: { recordId: string };
  BookAppointment: undefined;
  NewApplication: undefined;
  TrackApplications: undefined;
  CaseDetails: { applicationId: string };
  ContactSevak: undefined;
  Alerts: undefined;
};
