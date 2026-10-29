import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from './ProtectedRoute';

import Dashboard from '@/pages/Dashboard/Dashboard';
import Patients from '@/pages/Patients/Patients';
import Appointments from '@/pages/Appointments/Appointments';
import PatientDetails from '@/pages/PatientDetails/PatientDetails';
import Updates from '@/pages/Updates/Updates';
import Documents from '@/pages/Documents/Documents';
import OPDLogs from '@/pages/OPDLogs/OPDLogs';
import DoctorManagement from '@/pages/DoctorManagement/DoctorManagement';
import InfrastructureInfo from '@/pages/InfrastructureInfo/InfrastructureInfo';
import UrgentRequest from '@/pages/UrgentRequest/UrgentRequest';
import Notifications from '@/pages/Notifications/Notifications';
import Profile from '@/pages/Profile/Profile';
import Login from '@/pages/Auth/Login';
import NotFound from '@/pages/NotFound/NotFound';

import { ROUTES } from '@/utils/constants';

// Admin Module Components
import {
  AdminLayout,
  AdminDashboard,
  CaseQueue,
  CaseDetail,
  HospitalManagement,
  AddHospital,
  HospitalDetail,
  AssignSevakHospital,
  ReviewApprove,
  FollowUps,
  ArogyaSevaks,
  ArogyaSevakDetail,
  UsersManagement,
  AdminManagement,
  HonRavindraChavan,
  SchemeManagement,
  AddScheme,
  PackageMaster,
  Reports as AdminReports,
  AdminProfile,
  CaseDocuments,
  UrgentEscalations,
  EscalationCaseDetail,
  Referrals,
  SendNotifications,
  AdminProvider
} from '@/pages/admin';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Default Landing -> Login Page opens directly */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Login */}
      <Route path={ROUTES.LOGIN} element={<Login />} />

      {/* =========================
          Admin Module Routes
          ========================= */}
      <Route
        path="/admin"
        element={
          <AdminProvider>
            <AdminLayout />
          </AdminProvider>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="cases" element={<CaseQueue />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        <Route path="cases/review/:id" element={<ReviewApprove />} />
        <Route path="cases/:id/review" element={<ReviewApprove />} />
        <Route path="review/:id" element={<ReviewApprove />} />
        <Route path="review" element={<ReviewApprove />} />
        <Route path="escalations" element={<UrgentEscalations />} />
        <Route path="escalations/detail/:id" element={<EscalationCaseDetail />} />
        <Route path="escalations/case/:id" element={<EscalationCaseDetail />} />
        <Route path="hospitals" element={<HospitalManagement />} />
        <Route path="hospitals/add" element={<AddHospital />} />
        <Route path="hospitals/detail/:id" element={<HospitalDetail />} />
        <Route path="hospitals/view/:id" element={<HospitalDetail />} />
        <Route path="hospitals/assign-sevaks" element={<AssignSevakHospital />} />
        <Route path="hospitals/assign-sevaks/:hospitalId" element={<AssignSevakHospital />} />
        <Route path="follow-ups" element={<FollowUps />} />
        <Route path="documents" element={<CaseDocuments />} />
        <Route path="documents/:caseId" element={<CaseDocuments />} />
        <Route path="referrals" element={<Referrals />} />
        <Route path="notifications" element={<SendNotifications />} />
        <Route path="send-notifications" element={<SendNotifications />} />
        <Route path="broadcasts" element={<SendNotifications />} />
        <Route path="sevaks" element={<ArogyaSevaks />} />
        <Route path="sevaks/detail/:id" element={<ArogyaSevakDetail />} />
        <Route path="sevaks/view/:id" element={<ArogyaSevakDetail />} />
        <Route path="sevaks/:id" element={<ArogyaSevakDetail />} />
        <Route path="schemes" element={<SchemeManagement />} />
        <Route path="schemes/add" element={<AddScheme />} />
        <Route path="package-master" element={<PackageMaster />} />
        <Route path="packages" element={<PackageMaster />} />
        <Route path="admins" element={<AdminManagement />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="mla-profile" element={<HonRavindraChavan />} />
        <Route path="leadership" element={<HonRavindraChavan />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>


      {/* =========================================
          Citizen / Ward / ArogyaSevak Portal
          ========================================= */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/arogyasevak" element={<Navigate to="/arogyasevak/portal" replace />} />
          <Route path="/arogyasevak/dashboard" element={<Navigate to="/arogyasevak/portal" replace />} />
          <Route path="/arogyasevak/portal" element={<Dashboard />} />
          <Route path="/arogyasevak/patients" element={<Patients />} />
          <Route path="/arogyasevak/cases" element={<Patients />} />
          <Route path="/arogyasevak/appointments" element={<Appointments />} />
          <Route path="/arogyasevak/ward-monitoring" element={<Dashboard />} />
          <Route path="/arogyasevak/reports" element={<Dashboard />} />
          <Route path="/arogyasevak/settings" element={<Dashboard />} />

          {/* Patient Details */}
          <Route path={ROUTES.PATIENT_DETAILS} element={<PatientDetails />} />

          {/* Updates */}
          <Route path={ROUTES.UPDATES} element={<Updates />} />

          {/* Documents */}
          <Route path={ROUTES.DOCUMENTS} element={<Documents />} />

          {/* OPD Logs */}
          <Route path={ROUTES.OPD_LOGS} element={<OPDLogs />} />

          {/* Hospital Doctors & Duty Roster */}
          <Route path={ROUTES.DOCTORS} element={<DoctorManagement />} />
          <Route path="/arogyasevak/doctors" element={<DoctorManagement />} />

          {/* Urgent Request */}
          <Route path={ROUTES.URGENT_REQUEST} element={<UrgentRequest />} />

          {/* Infrastructure Information */}
          <Route path={ROUTES.INFRASTRUCTURE_INFO} element={<InfrastructureInfo />} />

          {/* Notifications */}
          <Route path={ROUTES.NOTIFICATIONS} element={<Notifications />} />
          <Route path="/arogyasevak/notifications" element={<Notifications />} />

          {/* Hospital Details for ArogyaSevak */}
          <Route path="/arogyasevak/hospital" element={<HospitalDetail />} />
          <Route path="/arogyasevak/hospital/:id" element={<HospitalDetail />} />
          <Route path="/arogyasevak/hospitals/:id" element={<HospitalDetail />} />

          {/* Profile */}
          <Route path={ROUTES.PROFILE} element={<Profile />} />

          {/* Backward compatibility alias redirects */}
          <Route path="/doctors" element={<Navigate to="/arogyasevak/doctors" replace />} />
          <Route path="/urgent-request" element={<Navigate to="/arogyasevak/urgent-request" replace />} />
          <Route path="/portal" element={<Navigate to="/arogyasevak/portal" replace />} />
          <Route path="/notifications" element={<Navigate to="/arogyasevak/notifications" replace />} />
          <Route path="/patient/:id" element={<PatientDetails />} />
          <Route path="/updates" element={<Navigate to="/arogyasevak/updates" replace />} />
          <Route path="/documents" element={<Navigate to="/arogyasevak/documents" replace />} />
          <Route path="/opd-logs" element={<Navigate to="/arogyasevak/opd-logs" replace />} />
          <Route path="/infrastructure-info" element={<Navigate to="/arogyasevak/infrastructure-info" replace />} />
          <Route path="/hospital" element={<Navigate to="/arogyasevak/hospital" replace />} />
          <Route path="/hospital/:id" element={<HospitalDetail />} />
          <Route path="/profile" element={<Navigate to="/arogyasevak/profile" replace />} />
        </Route>
      </Route>

      {/* 404 Catch All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;