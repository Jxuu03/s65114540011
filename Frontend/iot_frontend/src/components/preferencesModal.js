import React, { useState, useEffect, useCallback } from 'react';
import * as API from '../utils/API.js';
import { Button, InputNumber, Form, Modal } from 'antd';

const PreferencesModal = ({ isOpen, onClose }) => {
    const [form] = Form.useForm();
    const [preferences, setPreferences] = useState({
        minGrnTemp: '',
        maxGrnTemp: '',
        minOrgTemp: '',
        maxOrgTemp: '',
        minGrnPh: '',
        maxGrnPh: '',
        minOrgPh: '',
        maxOrgPh: '',
        minGrnTds: '',
        maxGrnTds: '',
        minOrgTds: '',
        maxOrgTds: '',
        grnWaterLv: '',
        orgWaterLv: '',
        tankHeight: ''
    })

    const fetchPreferences = useCallback(() => {
        API.fetchPreferences()
            .then(data => {
                setPreferences(data);
                form.setFieldsValue(data);
            })
            .catch(() => setPreferences('Error'));
    }, [form]);

    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);


    const handleSave = async (values) => {
        const stringifyWithSortedKeys = (obj) => {
            return JSON.stringify(obj, Object.keys(obj).sort());
        };

        const hasChanges = stringifyWithSortedKeys(values) !== stringifyWithSortedKeys(preferences);

        if (!hasChanges) {
            Modal.info({
                title: 'No Changes Detected!',
                content: 'No changes were made to the preferences, continue using the current one.',
                centered: true,
            });
            return;
        } else {
            API.savePreferences(values)
                .then((response) => {
                    console.log("Preferences saved successfully:", response);
                    fetchPreferences()
                })
                .catch(error => {
                    console.error('Error during instant feed:', error);
                });

            Modal.success({
                title: 'Successfully updated preferences!',
                content: 'You will get alert according to the new preferences.',
                centered: true,
            });
            return;
        }
    };


    const InputField = (props) => {
        return (
            <InputNumber
                className='custom-input-number'
                type='number'
                controls={false}
                {...props}
            />
        );
    };

    const formItemStyle = {
        display: 'flex',
        marginBottom: 0
    };

    const fieldStyle = (parameter) => {
        return {
            borderColor: parameter === 'Caution' ? 'rgba(255, 154, 3, 0.945)' : 'Turquoise',
        };
    };


    if (!isOpen) return null;

    return (
        <div className='modal-overlay'>
            <div className='modal-content preferences-modal'>
                <h2>Preferences Setting</h2>
                <p style={{ fontSize: '14px', color: 'gray', margin: '-10px 0 -5px 0', textAlign: 'center' }}>
                    Set custom ranges for each water quality parameter to get different type of alerts when values go out of range.
                </p>

                <Form
                    form={form}
                    onFinish={handleSave}
                >
                    {/* Temperature Preferences Setting */}
                    <p>Temperature (°C)</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', color: 'gray' }}>Normal:</span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Form.Item
                                name="minGrnTemp"
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="°C"
                                    min={0}
                                    max={60}
                                    style={fieldStyle('Normal')}
                                />
                            </Form.Item>
                            <span style={{ color: 'gray' }}>-</span>
                            <Form.Item
                                name='maxGrnTemp'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="°C"
                                    min={0}
                                    max={60}
                                    style={fieldStyle('Normal')}
                                />
                            </Form.Item>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', color: 'gray' }}>Caution:</span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                            <Form.Item
                                name='minOrgTemp'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="°C"
                                    min={0}
                                    max={60}
                                    style={fieldStyle('Caution')}
                                />
                            </Form.Item>

                            <span style={{ color: 'gray' }}>-</span>

                            <Form.Item
                                name='maxOrgTemp'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="°C"
                                    min={0}
                                    max={60}
                                    style={fieldStyle('Caution')}
                                />
                            </Form.Item>
                        </div>
                    </div>

                    {/* pH Preferences Setting */}
                    <p>pH</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', color: 'gray' }}>Normal:</span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Form.Item
                                name='minGrnPh'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="pH"
                                    min={0}
                                    max={14}
                                    style={fieldStyle('Normal')}
                                />
                            </Form.Item>

                            <span style={{ color: 'gray' }}>-</span>

                            <Form.Item
                                name='maxGrnPh'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="pH"
                                    min={0}
                                    max={14}
                                    style={fieldStyle('Normal')}
                                />
                            </Form.Item>

                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', color: 'gray' }}>Caution:</span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                            <Form.Item
                                name='minOrgPh'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="pH"
                                    min={0}
                                    max={10}
                                    style={fieldStyle('Caution')}
                                />
                            </Form.Item>

                            <span style={{ color: 'gray' }}>-</span>

                            <Form.Item
                                name='maxOrgPh'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="pH"
                                    min={0}
                                    max={10}
                                    style={fieldStyle('Caution')}
                                />
                            </Form.Item>

                        </div>
                    </div>

                    {/* TDS Preferences Setting */}
                    <p>Total Dissolved Solids (ppm)</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', color: 'gray' }}>Normal:</span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                            <Form.Item
                                name='minGrnTds'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="ppm"
                                    min={0}
                                    max={1000}
                                    style={fieldStyle('Normal')}
                                />
                            </Form.Item>

                            <span style={{ color: 'gray' }}>-</span>

                            <Form.Item
                                name='maxGrnTds'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="ppm"
                                    min={0}
                                    max={1000}
                                    style={fieldStyle('Normal')}
                                />
                            </Form.Item>

                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', color: 'gray' }}>Caution:</span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                            <Form.Item
                                name='minOrgTds'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="ppm"
                                    min={0}
                                    max={1000}
                                    style={fieldStyle('Caution')}
                                />
                            </Form.Item>

                            <span style={{ color: 'gray' }}>-</span>

                            <Form.Item
                                name='maxOrgTds'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="ppm"
                                    min={0}
                                    max={1000}
                                    style={fieldStyle('Caution')}
                                />
                            </Form.Item>

                        </div>
                    </div>

                    {/* WaterLV Preferences Setting */}
                    <p style={{ marginBottom: '5px' }}>Water Level (%)</p>
                    <span style={{ fontSize: '12.5px', color: 'gray' }}>Water Level Max at 100%, if goes higher than 100% or lower than Caution setting will be trigger DANGER alert.</span>

                    {/* For Tank Height in cm */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                        <span style={{ fontSize: '14px', color: 'gray' }}>Tank Height:</span>
                        <Form.Item
                            name='tankHeight'
                            style={formItemStyle}
                        >
                            <InputField
                                suffix="cm"
                                min={0}
                                max={1000}
                                style={{ width: '215px', ...fieldStyle('Normal') }}
                            />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', color: 'gray' }}>Normal:</span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                            <Form.Item
                                name='grnWaterLv'
                                style={formItemStyle}
                            >
                                <InputField
                                    suffix="%"
                                    min={0}
                                    max={100}
                                    style={{ width: '80px', ...fieldStyle('Normal') }}
                                />
                            </Form.Item>

                        </div>
                        <span style={{ fontSize: '14px', color: 'gray' }}>Caution:</span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                            <Form.Item
                                name='orgWaterLv'
                                style={formItemStyle}
                            >
                                <InputField

                                    suffix="%"
                                    min={0}
                                    max={100}
                                    style={{ width: '75px', ...fieldStyle('Caution') }}
                                />
                            </Form.Item>

                        </div>
                    </div>

                    <div style={{ justifyContent: 'space-between', marginTop: '15px' }}>
                        <Button className='button' htmlType='submit' type='submit'>
                            Save
                        </Button>
                        <Button
                            className='button'
                            style={{ backgroundColor: 'white', border: '1px solid gray' }}
                            type='button'
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                    </div>
                </Form>
            </div >
        </div >
    );
};

export default PreferencesModal;
