# -*- coding: utf-8 -*-
# Partner car information

from odoo import fields, models


class PartnerVehicle(models.Model):
    _inherit = 'fleet.vehicle'
    partner_id = fields.Many2one(
        comodel_name='res.partner',
        string='Partner',
    )