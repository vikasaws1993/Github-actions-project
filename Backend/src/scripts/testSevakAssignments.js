import { applicationService } from '../services/application.service.js';
import { ArogyaSevakModel } from '../models/arogyaSevak.model.js';
import db from '../config/db.js';

async function test() {
  try {
    const ass = await db.query('SELECT * FROM public.application_assignments WHERE application_id = $1', ['010062c9-b1ff-4165-bb41-f8d05dcd23cf']);
    console.log('Assignments for Shubhra:', ass.rows);

    const esc = await db.query('SELECT * FROM public.case_escalations WHERE application_id = $1', ['010062c9-b1ff-4165-bb41-f8d05dcd23cf']);
    console.log('Escalations for Shubhra:', esc.rows);

    const kunal = await ArogyaSevakModel.findByNameOrCode('Kunal');
    if (kunal) {
      const kunalApps = await applicationService.getSevakAssignedApplications(kunal.user_id || kunal.id);
      console.log('✅ Kunal Applications (Transferred tab):', kunalApps.length, kunalApps.map(a => ({ id: a.id, patient: a.patientName, isTransferredOut: a.isTransferredOut, status: a.status, assignedToNewHospital: a.assignedToNewHospital })));
    }

    const hariom = await ArogyaSevakModel.findByNameOrCode('hariom');
    if (hariom) {
      const hariomApps = await applicationService.getSevakAssignedApplications(hariom.user_id || hariom.id);
      console.log('✅ Hariom Applications (Active tab):', hariomApps.length, hariomApps.map(a => ({ id: a.id, patient: a.patientName, isTransferredOut: a.isTransferredOut, status: a.status, hosp: a.hospitalName })));
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

test();
