const request = require('supertest');
const app = require('../app'); 
const chai = require('chai');
const expect = chai.expect;

describe('Patient Routes', () => {
  it('GET /patients should return all patients', async () => { // retrieves patient test
    const res = await request(app).get('/patients').set('Accept', 'application/json');
    expect(res.status).to.equal(200);
    expect(res.text).to.include('All Patients');
  });

  it('POST /patients should add a new patient', async () => { // POST test to add a new patient
    const patientData = {
      name: 'John Doe',
      age: 30,
      condition: 'Medium',
      symptoms: 'Fever',
      infectionRisk: 'true'
    };

    const res = await request(app).post('/patients').type('form').send(patientData);
    expect(res.status).to.equal(302); //redirects after creating the patient
    expect(res.headers.location).to.equal('/patients'); // redirects to the patient list page
  });

  it('PUT /patients/:id should update a patient', async () => {
    const patientId = '67f556a9bc50ccbfdb510176'; // actual patient ID for patient called "bob"
    const updateData = { condition: 'High' };

    const res = await request(app).put(`/patients/${patientId}`).type('form').send(updateData);
    expect(res.status).to.equal(302); // redirects after updating the patient
    expect(res.headers.location).to.equal('/patients'); // redirects to patient list page
  });

  it('DELETE /patients/:id should delete a patient', async () => {
    const patientId = '67f556a9bc50ccbfdb510176'; // actual patient ID for patient called "bob"

    const res = await request(app).delete(`/patients/${patientId}`);
    expect(res.status).to.equal(302); //redirects after deleting the patient
    expect(res.headers.location).to.equal('/patients'); // redirects to the patient list page
  });
});

describe('Room Routes', () => {
  it('POST /rooms should add a new room', async () => {
    const roomData = {
      roomNumber: '101',
      type: 'General',
      capacity: 3
    };

    const res = await request(app).post('/rooms').type('form').send(roomData);
    expect(res.status).to.equal(302); // redirects after creating a room
    expect(res.headers.location).to.equal('/rooms'); // redirects to room list page
  });

  it('PUT /rooms/:id should update a room', async () => {
    const roomId = '67f5516e669ddaa6b538979b'; // should update room 111 to ICU
    const updateData = { type: 'ICU' };

    const res = await request(app).put(`/rooms/${roomId}`).type('form').send(updateData);
    expect(res.status).to.equal(302); // redirects after updating a room
    expect(res.headers.location).to.equal('/rooms'); //redirects to room list page
  });

  it('DELETE /rooms/:id should delete a room', async () => {
    const roomId = '67f5516e669ddaa6b538979b'; // should delete room 111

    const res = await request(app).delete(`/rooms/${roomId}`);
    expect(res.status).to.equal(302); //redirects after deleting the room
    expect(res.headers.location).to.equal('/rooms'); // redirects to room list page
  });
});

const mongoose = require('mongoose');

// Close MongoDB connection after all tests
after(async () => {
  await mongoose.connection.close();
});

