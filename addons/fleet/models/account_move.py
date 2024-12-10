from odoo import api, fields, models, _

class AccountMove(models.Model):
    _inherit = ['account.move']

    @api.depends('partner_id')
    def _compute_vehicle_invoice(self):
        for invoice in self:
            if invoice.partner_id:
                vehicles = self.env['fleet.vehicle'].search([('partner_id', '=', self.partner_id.id)], limit=2)
                if len(vehicles) == 1:
                    invoice.vehicle_id = vehicles[0]
                else:
                    invoice.vehicle_id = False
            else:
                invoice.vehicle_id = False

        return


    vehicle_id = fields.Many2one(
        comodel_name='fleet.vehicle',
        string='Vehicle', store=True,
        compute=_compute_vehicle_invoice,
        ondelete="set null", tracking=True,
        domain="[('partner_id', '=', partner_id))")


class FleetVehicle(models.Model):
    _inherit = ['fleet.vehicle']

    invoice_ids = fields.One2many(comodel_name='account.move', inverse_name='vehicle_id', string='Invoices')