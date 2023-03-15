import * as moment from "moment";
import { UtilHelper } from "src/app/_helpers";
import { AnalysisTaskStatus } from "src/app/_helpers/enums/analysis-task-status";
import { AnalysisResult } from "../analysis-result/analysis-result.model";
import { Deserializable } from "../deserializable.model";


export class AnalysisTask implements Deserializable {
  id: String;
  status: AnalysisTaskStatus;
  receivedAt: any;
  startedAt: any;
  failureAt: any;
  successAt: any;
  statusCheckedAt: any;
  statusCheckCode: number;
  statusCheckMessage: string;

  constructor() {
    this.id = '';
    this.status = AnalysisTaskStatus.Pending;
    this.statusCheckCode = 0;
    this.statusCheckMessage = '';

    this.statusCheckedAt = moment();
  }

  deserialize(input: any): this {
    this.id = input.taskID;
    this.status = input.taskState;

    this.statusCheckedAt = moment();

    const inputDateFielsMap = {
      failureAt: 'taskFailedDate',
      receivedAt: 'taskReceivedDate',
      startedAt: 'taskStartedDate',
      successAt: 'taskSucceededDate'
    } as any;

    // SET DATE FIEDS VALUES
    Object.keys(inputDateFielsMap).forEach((key) => {
      const inputDateField = input[inputDateFielsMap[key]];
      if (inputDateField) {
        (this as any)[key] = moment(moment.utc(inputDateField));
      }
    });

    return this;
  }

  fromLocalStorage(input: any): this {
    this.id = input.id;
    this.status = input.status;
    this.statusCheckCode = input.statusCheckCode;
    this.statusCheckMessage = input.statusCheckMessage;

    const inputDateFielsMap = [
      'failureAt',
      'receivedAt',
      'startedAt',
      'statusCheckedAt',
      'successAt',
    ];

    inputDateFielsMap.forEach((dateField) => {
      const dateValue = input[dateField];
      if (dateValue) {
        const momentDate = moment(dateValue);
        if (momentDate.isValid()) {
          (this as any)[dateField] = momentDate;
        }
      }
    });

    return this;
  }

  toLocalStorageString() {
    let obj = Object.assign({}, this);

    return JSON.stringify(obj);
  }

  get failureAtString() {
    return this.failureAt ? this.failureAt.format('L LTS') : '';
  }

  get receivedAtString() {
    return this.receivedAt ? this.receivedAt.format('L LTS') : '';
  }

  get startedAtString() {
    return this.startedAt ? this.startedAt.format('L LTS') : '';
  }

  get statusCheckedAtString() {
    return this.statusCheckedAt ? this.statusCheckedAt.format('L LTS') : '';
  }

  get successAtString() {
    return this.successAt ? this.successAt.format('L LTS') : '';
  }

  get successDurationString() {
    if (!this.startedAt || !this.successAt) {
      return "";
    }

    const durationMs = this.startedAt.diff(this.successAt, 'milliseconds');

    return UtilHelper.formatDuration(durationMs);
  }
}