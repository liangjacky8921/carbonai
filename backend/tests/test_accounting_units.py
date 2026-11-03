"""Local synthetic activity-unit regression; no external services or production data."""
import os
import unittest
if os.getenv('CARBONAI_ISOLATED_TESTS') != '1':
    raise unittest.SkipTest('Requires isolated test runner')
import asyncio
import io
import json
from starlette.datastructures import UploadFile
from fastapi import HTTPException
from app.accounting_units import calculate_unit_checked
from app.routers.business import emissions_upload
from app.factors import match_factor

class AccountingUnitTests(unittest.TestCase):
    def upload(self, rows):
        content='排放源,活动数据,单位,年份,月份,部门\n'+'\n'.join(rows)
        return asyncio.run(emissions_upload(UploadFile(io.BytesIO(content.encode('utf8')), filename='synthetic-mock.csv')))

    def test_equivalent_electricity(self):
        rows=self.upload(['电力,1000,kWh,2026,1,A','电力,1,MWh,2026,2,A','电力,500,kWh,2025,1,A','电力,0.5,MWh,2025,2,A'])['data']
        self.assertEqual(len(rows),4)
        for r,expected in zip(rows,[.5703,.5703,.28515,.28515]):
            self.assertAlmostEqual(r['emission'],expected,places=12)
            self.assertEqual(r['confidence'],'low')
            self.assertEqual(r['emissionUnit'],'tCO₂')
            self.assertEqual(r['scope'],'Scope 2')
        self.assertEqual(rows[0]['activity'],1000)
        self.assertEqual(rows[0]['unit'],'kWh')
        self.assertAlmostEqual(sum(r['emission'] for r in rows if r['year']==2026),1.1406)

    def test_mass_volume_heat(self):
        rows=self.upload(['柴油,1000,kg,2026','柴油,1,t,2026','天然气,10000,m³,2026','天然气,1,万m3,2026','热力,1,GJ,2026'])['data']
        for r,expected in zip(rows,[3.1605,3.1605,21.84,21.84,.11]):self.assertAlmostEqual(r['emission'],expected)

    def test_rejected_units_and_factors(self):
        for row in ['电力,1000,,2026','电力,1000,KWH,2026','电力,1000,kwh,2026','电力,1,吨,2026','柴油,1,L,2026','天然气,1,kg,2026','未知,1,吨,2026','航空,1,人·km,2026','卡车,1,吨·km,2026','电力,NaN,MWh,2026','电力,Infinity,MWh,2026','电力,0,MWh,2026']:
            with self.subTest(row=row),self.assertRaises(HTTPException) as error:self.upload([row])
            self.assertEqual(error.exception.status_code,422)

    def test_original_whitespace_and_factor_difference(self):
        r=self.upload(['电力,1000, kWh ,2026'])['data'][0]
        self.assertEqual(r['unit'],' kWh ')
        f={**match_factor('电力'),'factor':.6}
        self.assertEqual(calculate_unit_checked(1000,'kWh',f)['emission'],.6)
        self.assertEqual(match_factor('电力')['factor'],.5703)

    def test_finite_and_denominator(self):
        f=match_factor('电力')
        for activity in [float('inf'),float('nan'),-1,0]:
            with self.assertRaises(ValueError):calculate_unit_checked(activity,'MWh',f)
        with self.assertRaises(ValueError):calculate_unit_checked(1,'kWh',{**f,'factor_unit':'kgCO₂e/kWh'})
        with self.assertRaises(ValueError):calculate_unit_checked(1e308,'万m³',match_factor('天然气'))
